// Full Supabase backup & restore bridge.
// Called from the iframe (associoboard.html) via postMessage and executed
// here using the authenticated supabase client (so RLS applies as the
// signed-in superadmin).
import { supabase } from "@/integrations/supabase/client";

// Tables included in the snapshot. Order matters for restore.
// Parents-first order (used for INSERT). DELETE uses the reverse.
const RESTORE_ORDER = [
  "associations",
  "thematic_themes",
  "thematic_responses",
  "actions",
  "access_alerts",
  "documents",
  "referentiel_qualite",
  "evaluations",
  "evaluations_beneficiaires",
] as const;

// Read-only tables (kept in the export but not wiped/reinserted on restore
// because they reference auth.users and would break sign-in).
const READ_ONLY_TABLES = ["profiles", "user_roles"] as const;

type AnyRow = Record<string, unknown>;
export type Snapshot = {
  v: 2;
  ts: number;
  label: string;
  source: "supabase";
  tables: Record<string, AnyRow[]>;
};

async function fetchAll(table: string): Promise<AnyRow[]> {
  const all: AnyRow[] = [];
  const PAGE = 1000;
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from(table as never)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as AnyRow[];
    all.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export async function createSnapshot(): Promise<Snapshot> {
  const tables: Record<string, AnyRow[]> = {};
  const all = [...RESTORE_ORDER, ...READ_ONLY_TABLES];
  for (const t of all) {
    tables[t] = await fetchAll(t);
  }
  return {
    v: 2,
    ts: Date.now(),
    label: new Date().toLocaleString("fr-FR"),
    source: "supabase",
    tables,
  };
}

export async function restoreSnapshot(snap: Snapshot): Promise<{ ok: true; counts: Record<string, number> }> {
  if (!snap || snap.source !== "supabase" || !snap.tables) {
    throw new Error("Sauvegarde invalide");
  }

  // 1. Wipe in reverse-FK order
  const deleteOrder = [...RESTORE_ORDER].reverse();
  for (const t of deleteOrder) {
    const { error } = await supabase.from(t as never).delete().not("id", "is", null);
    if (error) throw new Error(`Suppression ${t}: ${error.message}`);
  }

  // 2. Re-insert in parent-first order, in chunks of 200
  const counts: Record<string, number> = {};
  for (const t of RESTORE_ORDER) {
    const rows = (snap.tables[t] ?? []) as AnyRow[];
    counts[t] = rows.length;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabase.from(t as never).insert(chunk as never);
      if (error) throw new Error(`Insertion ${t}: ${error.message}`);
    }
  }
  return { ok: true, counts };
}
