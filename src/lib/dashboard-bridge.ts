// Dashboard data bridge — builds HTML payloads injected into the iframe (#dashStats, #dashActions, #dashTL).
// The HTML markup mirrors the classes already in public/associoboard.html so styling stays identical.
import { supabase } from "@/integrations/supabase/client";

type Action = {
  id: string;
  assoc_id: string;
  titre: string;
  statut: string;
  thematique: string | null;
  axis_key: string | null;
  qpv_key: string | null;
  quartiers: string[] | null;
  tranches_age: string[] | null;
  annee: number | null;
  date_debut: string | null;
  heure_debut: string | null;
  nb_beneficiaires_prevu: number | null;
  nb_beneficiaires_reel: number | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
};

type Association = { id: string; nom: string };

type EvalBenef = {
  id: string;
  action_id: string;
  satisfaction: number | null;
  created_at: string;
};

type RefQualite = {
  id: string;
  action_id: string;
  assoc_id: string;
  score_global: number | null;
  c1: number | null; c2: number | null; c3: number | null; c4: number | null; c5: number | null;
  c6: number | null; c7: number | null; c8: number | null; c9: number | null; c10: number | null;
  created_at: string;
};

export type DashboardFilters = {
  year?: number | null;
  assocId?: string | null;
  thematique?: string | null;
};

export type DashboardData = {
  actions: Action[];
  associations: Association[];
  evals: EvalBenef[];
  refs: RefQualite[];
};

export async function fetchDashboardData(): Promise<DashboardData> {
  const [actionsRes, assocsRes, evalsRes, refsRes] = await Promise.all([
    supabase.from("actions").select("id, assoc_id, titre, statut, thematique, axis_key, qpv_key, quartiers, tranches_age, annee, date_debut, heure_debut, nb_beneficiaires_prevu, nb_beneficiaires_reel, budget, created_at, updated_at"),
    supabase.from("associations").select("id, nom"),
    supabase.from("evaluations_beneficiaires").select("id, action_id, satisfaction, created_at"),
    supabase.from("referentiel_qualite").select("id, action_id, assoc_id, score_global, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, created_at"),
  ]);
  return {
    actions: (actionsRes.data ?? []) as Action[],
    associations: (assocsRes.data ?? []) as Association[],
    evals: (evalsRes.data ?? []) as EvalBenef[],
    refs: (refsRes.data ?? []) as RefQualite[],
  };
}

function applyFilters(actions: Action[], f: DashboardFilters): Action[] {
  return actions.filter(a => {
    if (f.year && a.annee && a.annee !== f.year) return false;
    if (f.assocId && a.assoc_id !== f.assocId) return false;
    if (f.thematique && a.thematique !== f.thematique) return false;
    return true;
  });
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STATUT_BADGE: Record<string, string> = {
  planifiee: "blue",
  en_cours: "amber",
  recurrent: "purple",
  terminee: "green",
  favorable: "green",
  non_retenu: "rose",
  ajournee: "amber",
  oriente: "blue",
  annulee: "gray",
};

const STATUT_LABEL: Record<string, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  recurrent: "Récurrent",
  terminee: "Terminée",
  favorable: "Favorable",
  non_retenu: "Non retenu",
  ajournee: "Ajournée",
  oriente: "Orienté",
  annulee: "Annulée",
};

function statsHtml(data: DashboardData, filters: DashboardFilters): string {
  const acts = applyFilters(data.actions, filters);
  const year = filters.year ?? new Date().getFullYear();
  const assocCount = data.associations.length;
  const totalActions = acts.length;

  const assocScoped = !!filters.assocId;
  const beneficsArr = acts.map(a => a.nb_beneficiaires_reel ?? a.nb_beneficiaires_prevu ?? 0);
  const totalBenef = assocScoped
    ? beneficsArr.reduce((s, n) => s + n, 0)
    : (beneficsArr.length ? Math.round(beneficsArr.reduce((s, n) => s + n, 0) / beneficsArr.length) : 0);

  // Score qualité = moyenne par action (score_global si dispo, sinon moyenne(c1..c10)*20)
  const actionIds = new Set(acts.map(a => a.id));
  const scopedRefs = data.refs.filter(r => actionIds.has(r.action_id));
  const refScore = (r: RefQualite): number | null => {
    if (r.score_global != null) return r.score_global;
    const cs = [r.c1, r.c2, r.c3, r.c4, r.c5, r.c6, r.c7, r.c8, r.c9, r.c10].filter((v): v is number => v != null);
    return cs.length ? (cs.reduce((s, v) => s + v, 0) / cs.length) * 20 : null;
  };
  const refScores = scopedRefs.map(refScore).filter((v): v is number => v != null);
  const qualScorePct = refScores.length
    ? Math.round(refScores.reduce((s, v) => s + v, 0) / refScores.length)
    : 0;
  const qualLbl = filters.assocId
    ? (data.associations.find(a => a.id === filters.assocId)?.nom ?? "")
    : "Moy. toutes associations";

  // Satisfaction = moyenne satisfaction sur evals liées
  const scopedEvals = data.evals.filter(e => actionIds.has(e.action_id) && e.satisfaction != null);
  const satAvg = scopedEvals.length
    ? (scopedEvals.reduce((s, e) => s + (e.satisfaction ?? 0), 0) / scopedEvals.length)
    : null;

  return `
    <div class="stat-card"><div class="stat-blob" style="background:var(--primary)"></div><div class="stat-lbl">Actions ${year}</div><div class="stat-val" style="color:var(--primary)">${totalActions}</div><div class="stat-trend">${filters.assocId ? "Sélection : " + acts.length : assocCount + " associations"}</div></div>
    <div class="stat-card"><div class="stat-blob" style="background:var(--warning)"></div><div class="stat-lbl">Bénéficiaires${assocScoped ? " — Total" : " — Moyenne"}</div><div class="stat-val" style="color:oklch(0.6 0.17 60)">${totalBenef}</div><div class="stat-trend">${assocScoped ? "Total cumulé · " + acts.length + " action" + (acts.length > 1 ? "s" : "") : "Moyenne par action"}</div></div>
    <div class="stat-card"><div class="stat-blob" style="background:var(--accent-rose)"></div><div class="stat-lbl">Score Qualité</div><div class="stat-val" style="color:var(--accent-rose)">${qualScorePct || "—"}${qualScorePct ? "%" : ""}</div><div class="stat-trend">${escapeHtml(qualLbl)}</div></div>
    <div class="stat-card"><div class="stat-blob" style="background:var(--info)"></div><div class="stat-lbl">Satisfaction</div><div class="stat-val" style="color:var(--info)">${satAvg != null ? satAvg.toFixed(1) : "—"}<span style="font-size:14px">${satAvg != null ? "/5" : ""}</span></div><div class="stat-trend">${scopedEvals.length} évaluation${scopedEvals.length > 1 ? "s" : ""}</div></div>`;
}

function fmtDate(s: string | null): string {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return d && m && y ? `${d}/${m}/${y}` : s;
}

function actionCardHtml(a: Action, assocName: string): string {
  const badge = STATUT_BADGE[a.statut] ?? "gray";
  const statutLbl = STATUT_LABEL[a.statut] ?? a.statut;
  const quartiers = (a.quartiers ?? []).map(q => `<span class="badge badge-gray">${escapeHtml(q)}</span>`).join("");
  const ages = (a.tranches_age ?? []).slice(0, 2).map(g => `<span class="badge badge-blue">${escapeHtml(g)}</span>`).join("");
  const nb = a.nb_beneficiaires_reel ?? a.nb_beneficiaires_prevu ?? 0;
  const budget = a.budget ? Math.round(a.budget).toLocaleString("fr-FR") : "0";
  return `<div class="action-card" style="position:relative" onclick="window.parent && window.parent.postMessage({type:'ab-open-action',actionId:'${a.id}'},'*')">
    <div class="ac-bar" style="background:linear-gradient(135deg,var(--primary),var(--accent-rose))"></div>
    <div class="ac-ref"><span>${escapeHtml(assocName.toUpperCase())}</span><span class="badge badge-${badge}">${escapeHtml(statutLbl)}</span></div>
    <div class="ac-title">${escapeHtml(a.titre)}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px">${quartiers}${ages}</div>
    <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px">
      <button type="button" class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 10px" onclick="event.stopPropagation();window.parent && window.parent.postMessage({type:'ab-open-eval-modal',actionId:'${a.id}'},'*')">Évaluer bénéficiaires</button>
      <button type="button" class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 10px" onclick="event.stopPropagation();window.parent && window.parent.postMessage({type:'ab-open-qualite',actionId:'${a.id}'},'*')">Référentiel Qualité</button>
    </div>
    <div class="ac-footer" style="margin-top:8px">
      <span>${fmtDate(a.date_debut)} · ${escapeHtml(a.heure_debut ?? "")}</span>
      <span>${nb} part. · ${budget} €</span>
    </div>
  </div>`;
}

function actionsListHtml(data: DashboardData, filters: DashboardFilters, limit = 4): string {
  const acts = applyFilters(data.actions, filters)
    .slice()
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, limit);
  if (!acts.length) return `<p style="color:var(--muted-fore);font-size:12px;padding:9px 0">Aucune action</p>`;
  const assocMap = new Map(data.associations.map(a => [a.id, a.nom]));
  return acts.map(a => actionCardHtml(a, assocMap.get(a.assoc_id) ?? "—")).join("");
}

function timelineHtml(data: DashboardData, filters: DashboardFilters): string {
  const acts = applyFilters(data.actions, filters);
  const actionIds = new Set(acts.map(a => a.id));
  const assocMap = new Map(data.associations.map(a => [a.id, a.nom]));
  const actionMap = new Map(acts.map(a => [a.id, a]));

  type Item = { ts: string; color: string; label: string; text: string };
  const items: Item[] = [];

  for (const a of acts.slice(0, 20)) {
    items.push({
      ts: a.created_at,
      color: "var(--primary)",
      label: fmtTimelineDate(a.created_at),
      text: `<strong>${escapeHtml(a.titre)}</strong> — ${escapeHtml(assocMap.get(a.assoc_id) ?? "—")}`,
    });
  }
  for (const e of data.evals.filter(e => actionIds.has(e.action_id)).slice(0, 20)) {
    const a = actionMap.get(e.action_id);
    items.push({
      ts: e.created_at,
      color: "var(--success)",
      label: fmtTimelineDate(e.created_at),
      text: `<strong>${escapeHtml(a?.titre ?? "Action")}</strong> — évaluation bénéficiaire${e.satisfaction != null ? ` · satisfaction ${e.satisfaction}/5` : ""}`,
    });
  }
  for (const r of data.refs.filter(r => actionIds.has(r.action_id)).slice(0, 20)) {
    const a = actionMap.get(r.action_id);
    items.push({
      ts: r.created_at,
      color: "var(--accent-rose)",
      label: fmtTimelineDate(r.created_at),
      text: `<strong>${escapeHtml(a?.titre ?? "Action")}</strong> — référentiel qualité${r.score_global != null ? ` mis à jour : ${r.score_global}/100` : ""}`,
    });
  }

  items.sort((a, b) => (b.ts ?? "").localeCompare(a.ts ?? ""));
  const top = items.slice(0, 8);
  if (!top.length) return `<p style="color:var(--muted-fore);font-size:12px;padding:9px 0">Aucune activité récente</p>`;
  return top.map(i =>
    `<div class="tl-item"><div class="tl-dot" style="background:${i.color}"></div><div class="tl-date">${escapeHtml(i.label)}</div><div class="tl-txt">${i.text}</div></div>`
  ).join("");
}

function fmtTimelineDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayOnly = new Date(d); dayOnly.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - dayOnly.getTime()) / 86400000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (diffDays === 0) return `Aujourd'hui — ${hh}:${mm}`;
  if (diffDays === 1) return `Hier — ${hh}:${mm}`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const QUALITE_AXES: { key: keyof RefQualite; id: string; name: string; color: string }[] = [
  { key: "c1",  id: "C1",  name: "C1 — COMMUNICATION",                color: "oklch(0.52 0.22 285)" },
  { key: "c2",  id: "C2",  name: "C2 — OBJECTIFS",                    color: "oklch(0.62 0.22 340)" },
  { key: "c3",  id: "C3",  name: "C3 — QUALIFICATION & COMPÉTENCES",  color: "oklch(0.52 0.16 150)" },
  { key: "c4",  id: "C4",  name: "C4 — MODALITÉS & DÉROULÉ",          color: "oklch(0.76 0.17 75)"  },
  { key: "c5",  id: "C5",  name: "C5 — CONFORMITÉ & VEILLE LÉGALE",   color: "oklch(0.6 0.17 240)"  },
  { key: "c6",  id: "C6",  name: "C6 — MOYENS PÉDAGOGIQUES",          color: "oklch(0.52 0.22 285)" },
  { key: "c7",  id: "C7",  name: "C7 — GESTION FINANCIÈRE",           color: "oklch(0.62 0.22 340)" },
  { key: "c8",  id: "C8",  name: "C8 — ÉVALUATION & IMPACT",          color: "oklch(0.52 0.16 150)" },
  { key: "c9",  id: "C9",  name: "C9 — AMÉLIORATION CONTINUE",        color: "oklch(0.76 0.17 75)"  },
  { key: "c10", id: "C10", name: "C10 — TRANSITION ÉCOLOGIQUE",       color: "oklch(0.52 0.16 150)" },
];

function qualiteHtml(data: DashboardData, filters: DashboardFilters): string {
  const acts = applyFilters(data.actions, filters);
  const actionIds = new Set(acts.map(a => a.id));
  const refs = data.refs.filter(r => actionIds.has(r.action_id));

  const scopeName = filters.assocId
    ? (data.associations.find(a => a.id === filters.assocId)?.nom ?? "")
    : "Toutes les associations";

  // Moyenne globale
  const globals = refs.map(r => r.score_global).filter((v): v is number => v != null);
  const globalAvg = globals.length ? Math.round(globals.reduce((s, v) => s + v, 0) / globals.length) : 0;

  // Moyenne par association
  const byAssoc = new Map<string, number[]>();
  for (const r of refs) {
    if (r.score_global == null) continue;
    if (!byAssoc.has(r.assoc_id)) byAssoc.set(r.assoc_id, []);
    byAssoc.get(r.assoc_id)!.push(r.score_global);
  }
  const assocMap = new Map(data.associations.map(a => [a.id, a.nom]));
  const assocRows = Array.from(byAssoc.entries())
    .map(([aid, list]) => ({
      nom: assocMap.get(aid) ?? "—",
      avg: Math.round(list.reduce((s, v) => s + v, 0) / list.length),
      n: list.length,
    }))
    .sort((x, y) => y.avg - x.avg);

  const assocHtml = assocRows.length
    ? assocRows.map(r => `
      <div class="qual-crit-item">
        <span class="qual-crit-id" style="min-width:120px;color:var(--primary);font-size:11px;font-weight:700">${escapeHtml(r.nom)}</span>
        <span class="qual-crit-txt" style="font-size:11px;color:var(--muted-fore)">${r.n} action${r.n > 1 ? "s" : ""}</span>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <div class="qual-crit-bar" style="width:60px"><div class="qual-crit-bar-fill" style="width:${r.avg}%;background:var(--primary)"></div></div>
          <span class="qual-crit-pct" style="color:var(--primary);min-width:32px;text-align:right">${r.avg}%</span>
        </div>
      </div>`).join("")
    : '<p style="color:var(--muted-fore);font-size:12px;padding:6px 0">Aucune évaluation qualité dans le périmètre</p>';

  // Moyenne par axe C1-C10
  const axesHtml = QUALITE_AXES.map(ax => {
    const vals = refs.map(r => r[ax.key] as number | null).filter((v): v is number => v != null);
    const avg = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
    return `
      <div class="qual-axe" style="border-radius:calc(var(--radius));margin-bottom:6px">
        <div class="qual-axe-hdr">
          <div class="qual-axe-name" style="color:${ax.color};font-size:12px">
            <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="${ax.color}" stroke-width="1.5" stroke-linecap="round"><path d="M7 1l1.6 3.6 3.8.5-2.7 2.7.6 3.6L7 9.6 3.7 11.4l.6-3.6L1.6 5.1 5.4 4.6z"/></svg>
            ${escapeHtml(ax.name)}
          </div>
          <div style="display:flex;align-items:center;gap:7px;flex-shrink:0">
            <div style="width:70px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${avg}%;height:100%;background:${ax.color};border-radius:3px;transition:width .7s"></div></div>
            <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;color:${ax.color};min-width:34px">${avg}%</span>
          </div>
        </div>
      </div>`;
  }).join("");

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 2px 10px;border-bottom:1px dashed var(--border);margin-bottom:8px">
      <div style="font-size:11px;color:var(--muted-fore)">${escapeHtml(scopeName)} · <strong>Tous critères</strong></div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:800;color:var(--primary)">${globalAvg || "—"}${globalAvg ? "%" : ""}</div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--muted-fore);text-transform:uppercase;letter-spacing:.5px;margin:4px 0 6px">Moyenne par association</div>
    ${assocHtml}
    <div style="font-size:11px;font-weight:700;color:var(--muted-fore);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px;border-top:1px dashed var(--border);padding-top:8px">Critères C1 → C10</div>
    ${axesHtml}`;
}

export function buildDashboardPayload(data: DashboardData, filters: DashboardFilters) {
  return {
    type: "ab-supabase-dashboard" as const,
    html: {
      stats: statsHtml(data, filters),
      actions: actionsListHtml(data, filters),
      timeline: timelineHtml(data, filters),
      qualite: qualiteHtml(data, filters),
    },
  };
}
