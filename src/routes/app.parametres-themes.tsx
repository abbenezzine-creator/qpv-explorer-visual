import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Palette, Save, RotateCcw, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getUser } from "@/lib/auth";
import { ICON_NAMES, THEME_ICON_REGISTRY, loadThemeOverrides } from "@/lib/theme-overrides";
import { THEMATIQUE_OPTIONS } from "@/lib/actions-data";
import { themeHex, THEME_STYLES, DEFAULT_STYLE } from "@/components/ThemeBadge";

export const Route = createFileRoute("/app/parametres-themes")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: ParametresThemesPage,
});

type Row = { id?: string; thematique: string; color_hex: string; icon_name: string };

function defaultIconNameFor(t: string): string {
  const s = THEME_STYLES[t] ?? DEFAULT_STYLE;
  const name = (s.icon as unknown as { displayName?: string; name?: string }).displayName
    ?? (s.icon as unknown as { name?: string }).name
    ?? "Tag";
  return ICON_NAMES.includes(name) ? name : "Tag";
}

function ParametresThemesPage() {
  const user = getUser();
  const isSuperAdmin = user?.role === "superadmin";

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["theme-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theme_settings" as never)
        .select("id, thematique, color_hex, icon_name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    enabled: isSuperAdmin,
  });

  const baseRows: Row[] = useMemo(() => {
    const map = new Map<string, Row>();
    for (const t of THEMATIQUE_OPTIONS) {
      map.set(t, { thematique: t, color_hex: themeHex(t), icon_name: defaultIconNameFor(t) });
    }
    for (const r of data ?? []) {
      map.set(r.thematique, { id: r.id, thematique: r.thematique, color_hex: r.color_hex, icon_name: r.icon_name });
    }
    return Array.from(map.values());
  }, [data]);

  const [draft, setDraft] = useState<Record<string, { color_hex: string; icon_name: string }>>({});

  useEffect(() => {
    const d: typeof draft = {};
    for (const r of baseRows) d[r.thematique] = { color_hex: r.color_hex, icon_name: r.icon_name };
    setDraft(d);
  }, [baseRows]);

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6 text-center">
          <p className="text-muted-foreground">Accès réservé aux superadmins.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/app"><ArrowLeft className="h-4 w-4 mr-1" />Retour</Link>
          </Button>
        </div>
      </div>
    );
  }

  const save = async (row: Row) => {
    const v = draft[row.thematique];
    if (!v) return;
    if (row.id) {
      const { error } = await supabase
        .from("theme_settings" as never)
        .update({ color_hex: v.color_hex, icon_name: v.icon_name } as never)
        .eq("id", row.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase
        .from("theme_settings" as never)
        .insert({ thematique: row.thematique, color_hex: v.color_hex, icon_name: v.icon_name } as never);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Personnalisation enregistrée");
    await loadThemeOverrides(true);
    refetch();
  };

  const reset = async (row: Row) => {
    if (!row.id) {
      setDraft((p) => ({ ...p, [row.thematique]: { color_hex: themeHex(row.thematique), icon_name: defaultIconNameFor(row.thematique) } }));
      return;
    }
    if (!confirm("Réinitialiser cette thématique aux valeurs par défaut ?")) return;
    const { error } = await supabase.from("theme_settings" as never).delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Réinitialisée");
    await loadThemeOverrides(true);
    refetch();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/app" search={{ page: "parametres" }}><ArrowLeft className="h-4 w-4 mr-1" />Administration</Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" /> Personnalisation des thématiques
          </h1>
          <p className="text-sm text-muted-foreground">
            Couleur et icône appliquées partout (cards, pastilles, listes, dashboard). La liste est synchronisée avec les thématiques d'actions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />Rafraîchir
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thématique</TableHead>
              <TableHead>Couleur</TableHead>
              <TableHead>Icône</TableHead>
              <TableHead>Aperçu</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Chargement…</TableCell></TableRow>}
            {baseRows.map((r) => {
              const v = draft[r.thematique] ?? { color_hex: r.color_hex, icon_name: r.icon_name };
              return (
                <TableRow key={r.thematique}>
                  <TableCell className="font-medium">{r.thematique}{!r.id && <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">par défaut</span>}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={v.color_hex}
                        onChange={(e) => setDraft((p) => ({ ...p, [r.thematique]: { ...v, color_hex: e.target.value } }))}
                        className="w-12 p-1 h-9"
                      />
                      <Input
                        value={v.color_hex}
                        onChange={(e) => setDraft((p) => ({ ...p, [r.thematique]: { ...v, color_hex: e.target.value } }))}
                        className="w-28 font-mono text-xs"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <IconSelect value={v.icon_name} onChange={(val) => setDraft((p) => ({ ...p, [r.thematique]: { ...v, icon_name: val } }))} />
                  </TableCell>
                  <TableCell><PreviewBadge thematique={r.thematique} color_hex={v.color_hex} icon_name={v.icon_name} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => save(r)} className="mr-2"><Save className="h-3.5 w-3.5 mr-1" />Enregistrer</Button>
                    <Button size="sm" variant="outline" onClick={() => reset(r)}><RotateCcw className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const Cur = THEME_ICON_REGISTRY[value];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <span className="inline-flex items-center gap-2">
          {Cur ? <Cur className="h-4 w-4" /> : null}
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {ICON_NAMES.map((n) => {
          const I = THEME_ICON_REGISTRY[n];
          return (
            <SelectItem key={n} value={n}>
              <span className="inline-flex items-center gap-2"><I className="h-4 w-4" />{n}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function PreviewBadge({ thematique, color_hex, icon_name }: { thematique: string; color_hex: string; icon_name: string }) {
  const I = THEME_ICON_REGISTRY[icon_name];
  const bg = `${color_hex}24`;
  return (
    <span
      className="inline-flex items-center gap-1.5 self-start rounded-full font-semibold ring-1 px-2.5 py-1 text-[11px]"
      style={{ background: bg, color: color_hex, boxShadow: `inset 0 0 0 1px ${color_hex}59` }}
    >
      {I ? <I className="h-4 w-4" /> : null}
      {thematique}
    </span>
  );
}
