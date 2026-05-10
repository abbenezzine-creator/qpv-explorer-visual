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

  // Score qualité = moyenne des score_global des refs liées aux actions filtrées
  const actionIds = new Set(acts.map(a => a.id));
  const scopedRefs = data.refs.filter(r => actionIds.has(r.action_id) && r.score_global != null);
  const qualScorePct = scopedRefs.length
    ? Math.round(scopedRefs.reduce((s, r) => s + (r.score_global ?? 0), 0) / scopedRefs.length)
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
      <button type="button" class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 10px" onclick="event.stopPropagation();window.parent && window.parent.postMessage({type:'ab-navigate',to:'/app/actions/${a.id}/qualite'},'*')">Référentiel Qualité</button>
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

export function buildDashboardPayload(data: DashboardData, filters: DashboardFilters) {
  return {
    type: "ab-supabase-dashboard" as const,
    html: {
      stats: statsHtml(data, filters),
      actions: actionsListHtml(data, filters),
      timeline: timelineHtml(data, filters),
    },
  };
}
