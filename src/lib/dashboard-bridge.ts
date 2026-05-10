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
  actionId?: string | null;
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
    if (f.actionId && a.id !== f.actionId) return false;
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

  // Score qualité — accepte les évaluations partielles (score_global ou n'importe quels c1..c10).
  const actionIds = new Set(acts.map(a => a.id));
  const scopedRefs = data.refs.filter(r => actionIds.has(r.action_id));
  const refScore = (r: RefQualite): { val: number; partial: boolean } | null => {
    if (r.score_global != null) return { val: r.score_global, partial: false };
    const cs = [r.c1, r.c2, r.c3, r.c4, r.c5, r.c6, r.c7, r.c8, r.c9, r.c10].filter((v): v is number => v != null);
    if (!cs.length) return null;
    return { val: (cs.reduce((s, v) => s + v, 0) / cs.length) * 20, partial: cs.length < 10 };
  };
  const refScoresDetailed = scopedRefs.map(refScore).filter((v): v is { val: number; partial: boolean } => v != null);
  const hasAnyRef = scopedRefs.length > 0;
  const hasScore = refScoresDetailed.length > 0;
  const qualScorePct = hasScore
    ? Math.round(refScoresDetailed.reduce((s, v) => s + v.val, 0) / refScoresDetailed.length)
    : 0;
  const partialCount = refScoresDetailed.filter(s => s.partial).length;
  const baseLbl = filters.assocId
    ? (data.associations.find(a => a.id === filters.assocId)?.nom ?? "")
    : "Moy. toutes associations";
  const qualLbl = !hasAnyRef
    ? "Aucune évaluation qualité"
    : !hasScore
      ? "Évaluations sans données chiffrées"
      : partialCount > 0
        ? `${baseLbl} · ${partialCount} partielle${partialCount > 1 ? "s" : ""}`
        : baseLbl;
  const qualValHtml = hasScore
    ? `${qualScorePct}%`
    : `<span style="font-size:18px;color:var(--muted-fore);font-weight:600">Aucune donnée</span>`;

  // Satisfaction = moyenne satisfaction sur evals liées
  const scopedEvals = data.evals.filter(e => actionIds.has(e.action_id) && e.satisfaction != null);
  const satAvg = scopedEvals.length
    ? (scopedEvals.reduce((s, e) => s + (e.satisfaction ?? 0), 0) / scopedEvals.length)
    : null;

  return `
    <div class="stat-card"><div class="stat-blob" style="background:var(--primary)"></div><div class="stat-lbl">Actions ${year}</div><div class="stat-val" style="color:var(--primary)">${totalActions}</div><div class="stat-trend">${filters.assocId ? "Sélection : " + acts.length : assocCount + " associations"}</div></div>
    <div class="stat-card"><div class="stat-blob" style="background:var(--warning)"></div><div class="stat-lbl">Bénéficiaires${assocScoped ? " — Total" : " — Moyenne"}</div><div class="stat-val" style="color:oklch(0.6 0.17 60)">${totalBenef}</div><div class="stat-trend">${assocScoped ? "Total cumulé · " + acts.length + " action" + (acts.length > 1 ? "s" : "") : "Moyenne par action"}</div></div>
    <div class="stat-card"><div class="stat-blob" style="background:var(--accent-rose)"></div><div class="stat-lbl">Score Qualité</div><div class="stat-val" style="color:var(--accent-rose)">${qualValHtml}</div><div class="stat-trend">${escapeHtml(qualLbl)}</div></div>
    <div class="stat-card"><div class="stat-blob" style="background:var(--info)"></div><div class="stat-lbl">Satisfaction</div><div class="stat-val" style="color:var(--info)">${satAvg != null ? satAvg.toFixed(1) : "—"}<span style="font-size:14px">${satAvg != null ? "/5" : ""}</span></div><div class="stat-trend">${scopedEvals.length} évaluation${scopedEvals.length > 1 ? "s" : ""}</div></div>`;
}

function fmtDate(s: string | null): string {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return d && m && y ? `${d}/${m}/${y}` : s;
}

function actionScoreFromRefs(refs: RefQualite[]): number | null {
  const vals: number[] = [];
  for (const r of refs) {
    if (r.score_global != null) { vals.push(r.score_global); continue; }
    const cs = [r.c1, r.c2, r.c3, r.c4, r.c5, r.c6, r.c7, r.c8, r.c9, r.c10].filter((v): v is number => v != null);
    if (cs.length) vals.push((cs.reduce((s, v) => s + v, 0) / cs.length) * 20);
  }
  if (!vals.length) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

function actionCardHtml(a: Action, assocName: string, refsCount: number, evalsCount: number, scoreAvg: number | null): string {
  const badge = STATUT_BADGE[a.statut] ?? "gray";
  const statutLbl = STATUT_LABEL[a.statut] ?? a.statut;
  const quartiers = (a.quartiers ?? []).map(q => `<span class="badge badge-gray">${escapeHtml(q)}</span>`).join("");
  const ages = (a.tranches_age ?? []).slice(0, 2).map(g => `<span class="badge badge-blue">${escapeHtml(g)}</span>`).join("");
  const nb = a.nb_beneficiaires_reel ?? a.nb_beneficiaires_prevu ?? 0;
  const budget = a.budget ? Math.round(a.budget).toLocaleString("fr-FR") : "0";
  const refState = refsCount > 0 ? "is-done" : "is-pending";
  const refLbl = refsCount > 0 ? `Référentiel Qualité <span class="cnt">${refsCount}</span>` : `Référentiel Qualité`;
  const bfState = evalsCount > 0 ? "is-filled" : "is-empty";
  const bfLbl = evalsCount > 0
    ? `Évaluer bénéficiaires <span class="cnt">${evalsCount}</span>`
    : `Évaluer bénéficiaires`;
  const scoreBadge = scoreAvg != null
    ? `<span class="badge" style="background:color-mix(in oklab, var(--accent-rose) 15%, transparent);color:var(--accent-rose);font-weight:700">★ ${scoreAvg}%</span>`
    : `<span class="badge badge-gray" style="opacity:.7">★ —</span>`;
  return `<div class="action-card" style="position:relative" onclick="window.parent && window.parent.postMessage({type:'ab-open-action',actionId:'${a.id}'},'*')">
    <div class="ac-bar" style="background:linear-gradient(135deg,var(--primary),var(--accent-rose))"></div>
    <div class="ac-ref"><span>${escapeHtml(assocName.toUpperCase())}</span><span class="badge badge-${badge}">${escapeHtml(statutLbl)}</span></div>
    <div class="ac-title">${escapeHtml(a.titre)}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px;align-items:center">${scoreBadge}${quartiers}${ages}</div>
    <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px;flex-wrap:wrap">
      <button type="button" class="btn-bf ${bfState}" onclick="event.stopPropagation();window.parent && window.parent.postMessage({type:'ab-open-eval-modal',actionId:'${a.id}'},'*')">${bfLbl}</button>
      <button type="button" class="btn-ref ${refState}" onclick="event.stopPropagation();window.parent && window.parent.postMessage({type:'ab-open-qualite',actionId:'${a.id}'},'*')">${refLbl}</button>
    </div>
    <div class="ac-footer" style="margin-top:8px">
      <span>${fmtDate(a.date_debut)} · ${escapeHtml(a.heure_debut ?? "")}</span>
      <span>${nb} part. · ${budget} €</span>
    </div>
  </div>`;
}

function buildActionMaps(data: DashboardData) {
  const assocMap = new Map(data.associations.map(a => [a.id, a.nom]));
  const refsByAction = new Map<string, number>();
  const refsListByAction = new Map<string, RefQualite[]>();
  for (const r of data.refs) {
    refsByAction.set(r.action_id, (refsByAction.get(r.action_id) ?? 0) + 1);
    if (!refsListByAction.has(r.action_id)) refsListByAction.set(r.action_id, []);
    refsListByAction.get(r.action_id)!.push(r);
  }
  const evalsByAction = new Map<string, number>();
  for (const e of data.evals) evalsByAction.set(e.action_id, (evalsByAction.get(e.action_id) ?? 0) + 1);
  return { assocMap, refsByAction, refsListByAction, evalsByAction };
}

function actionsListHtml(data: DashboardData, filters: DashboardFilters, limit = 4): string {
  const acts = applyFilters(data.actions, filters)
    .slice()
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, limit);
  if (!acts.length) return `<p style="color:var(--muted-fore);font-size:12px;padding:9px 0">Aucune action</p>`;
  const { assocMap, refsByAction, refsListByAction, evalsByAction } = buildActionMaps(data);
  return acts.map(a => actionCardHtml(
    a,
    assocMap.get(a.assoc_id) ?? "—",
    refsByAction.get(a.id) ?? 0,
    evalsByAction.get(a.id) ?? 0,
    actionScoreFromRefs(refsListByAction.get(a.id) ?? []),
  )).join("");
}

function allActionsByThemeHtml(data: DashboardData, filters: DashboardFilters): string {
  const acts = applyFilters(data.actions, filters)
    .slice()
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
  if (!acts.length) return `<p style="color:var(--muted-fore);font-size:13px;padding:18px;text-align:center">Aucune action</p>`;
  const { assocMap, refsByAction, refsListByAction, evalsByAction } = buildActionMaps(data);
  const groups = new Map<string, Action[]>();
  for (const a of acts) {
    const k = a.thematique ?? "Sans thématique";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(a);
  }
  const ordered = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  return ordered.map(([theme, list]) => `
    <div class="theme-block" data-theme="${escapeHtml(theme)}" style="margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:8px;margin:6px 0 10px;padding-bottom:6px;border-bottom:1px dashed var(--border)">
        <span style="font-family:'Lexend',sans-serif;font-weight:700;font-size:13px;color:var(--primary);text-transform:uppercase;letter-spacing:.5px">${escapeHtml(theme)}</span>
        <span style="font-size:11px;color:var(--muted-fore)">${list.length} action${list.length > 1 ? "s" : ""}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
        ${list.map(a => actionCardHtml(
          a,
          assocMap.get(a.assoc_id) ?? "—",
          refsByAction.get(a.id) ?? 0,
          evalsByAction.get(a.id) ?? 0,
          actionScoreFromRefs(refsListByAction.get(a.id) ?? []),
        )).join("")}
      </div>
    </div>`).join("");
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

const QUALITE_AXES: { key: keyof RefQualite; id: string; name: string; color: string; details: string[] }[] = [
  { key: "c1",  id: "C1",  name: "C1 — COMMUNICATION",                color: "oklch(0.52 0.22 285)", details: [
    "L'organisme diffuse une information accessible au public, détaillée et vérifiable.",
    "L'organisme diffuse des indicateurs de résultats adaptés à la nature des actions.",
    "L'organisme met en avant les commanditaires et financeurs sur ses supports.",
  ] },
  { key: "c2",  id: "C2",  name: "C2 — OBJECTIFS",                    color: "oklch(0.62 0.22 340)", details: [
    "Analyse du besoin du bénéficiaire en lien avec les commanditaires et financeurs.",
    "Définition des objectifs opérationnels et évaluables.",
    "Établissement des contenus et des modalités de mise en œuvre.",
    "Procédures de positionnement et d'évaluation des bénéficiaires.",
  ] },
  { key: "c3",  id: "C3",  name: "C3 — QUALIFICATION & COMPÉTENCES",  color: "oklch(0.52 0.16 150)", details: [
    "Qualifications indispensables à l'activité (diplôme, agrément, etc.).",
    "Formation relative aux valeurs de la République et à la laïcité (VRL).",
    "Compétences des intervenants internes et/ou externes évaluées.",
    "Développement des compétences des salariés adapté aux prestations.",
  ] },
  { key: "c4",  id: "C4",  name: "C4 — MODALITÉS & DÉROULÉ",          color: "oklch(0.76 0.17 75)",  details: [
    "Information des bénéficiaires des conditions de déroulement.",
    "Information des bénéficiaires des modalités de l'action.",
  ] },
  { key: "c5",  id: "C5",  name: "C5 — CONFORMITÉ & VEILLE LÉGALE",   color: "oklch(0.6 0.17 240)",  details: [
    "Agréments relatifs à la conformité de l'organisme.",
    "Veille réglementaire active.",
  ] },
  { key: "c6",  id: "C6",  name: "C6 — MOYENS PÉDAGOGIQUES",          color: "oklch(0.52 0.22 285)", details: [
    "Moyens humains et techniques adaptés, environnement approprié.",
    "Mobilisation et coordination des intervenants.",
    "Ressources pédagogiques mises à disposition des bénéficiaires.",
    "Référent handicap, appui mobilité, conseil de perfectionnement.",
    "Projet formalisé (éducatif, pédagogique, social, culturel…).",
  ] },
  { key: "c7",  id: "C7",  name: "C7 — GESTION FINANCIÈRE",           color: "oklch(0.62 0.22 340)", details: [
    "Tableau de résultat analytique sur les actions subventionnées.",
    "Tableau récapitulatif sur la répartition des moyens humains.",
  ] },
  { key: "c8",  id: "C8",  name: "C8 — ÉVALUATION & IMPACT",          color: "oklch(0.52 0.16 150)", details: [
    "Outils d'évaluation sur les objectifs opérationnels.",
    "Outils d'évaluation sur le personnel.",
    "Outils d'évaluation et/ou label qualité.",
  ] },
  { key: "c9",  id: "C9",  name: "C9 — AMÉLIORATION CONTINUE",        color: "oklch(0.76 0.17 75)",  details: [
    "Évaluation de satisfaction à destination des bénéficiaires.",
    "Évaluation de satisfaction à destination des commanditaires.",
    "Évaluation de satisfaction à destination des partenaires.",
    "Évaluation sur l'utilité sociale de l'action.",
    "Évaluation des écarts et amélioration continue.",
  ] },
  { key: "c10", id: "C10", name: "C10 — TRANSITION ÉCOLOGIQUE",       color: "oklch(0.52 0.16 150)", details: [
    "Indicateur transversal : intégration de la dimension environnementale.",
  ] },
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

  // Moyenne par axe C1-C10 — calcul
  const axesData = QUALITE_AXES.map(ax => {
    const vals = refs.map(r => r[ax.key] as number | null).filter((v): v is number => v != null);
    const avg = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
    return { ...ax, avg, n: vals.length };
  });

  const starsHtml = (pct: number, color: string) => {
    const filled = pct / 20; // 5 étoiles
    let out = '';
    for (let i = 1; i <= 5; i++) {
      const ratio = Math.max(0, Math.min(1, filled - (i - 1)));
      const pctFill = Math.round(ratio * 100);
      out += `<span style="position:relative;display:inline-block;width:14px;height:14px;line-height:1">
        <span style="color:var(--border);font-size:14px;line-height:1">★</span>
        <span style="position:absolute;left:0;top:0;width:${pctFill}%;overflow:hidden;color:${color};font-size:14px;line-height:1">★</span>
      </span>`;
    }
    return `<span style="display:inline-flex;gap:1px;align-items:center">${out}</span>`;
  };

  const axeRowHtml = (ax: typeof axesData[number]) => `
    <details class="qual-axe" data-axe="${ax.id}" style="border-radius:calc(var(--radius));margin-bottom:6px;border:1px solid var(--border);padding:6px 8px">
      <summary style="cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div class="qual-axe-name" style="color:${ax.color};font-size:12px;display:flex;align-items:center;gap:6px">
          <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="${ax.color}" stroke-width="1.5" stroke-linecap="round"><path d="M7 1l1.6 3.6 3.8.5-2.7 2.7.6 3.6L7 9.6 3.7 11.4l.6-3.6L1.6 5.1 5.4 4.6z"/></svg>
          <span style="font-weight:700">${escapeHtml(ax.name)}</span>
          <span style="color:var(--muted-fore);font-size:10px">▾</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          ${starsHtml(ax.avg, ax.color)}
          <div style="width:60px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${ax.avg}%;height:100%;background:${ax.color};border-radius:3px;transition:width .7s"></div></div>
          <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;color:${ax.color};min-width:34px;text-align:right">${ax.avg}%</span>
        </div>
      </summary>
      <ul style="margin:8px 0 4px 0;padding:0;list-style:none;font-size:11px;color:var(--foreground);line-height:1.4">
        ${ax.details.map((d, i) => `
          <li style="display:flex;align-items:center;gap:8px;padding:4px 0;border-top:1px dashed var(--border)">
            <span style="min-width:18px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:${ax.color}">${ax.id}.${i + 1}</span>
            <span style="flex:1">${escapeHtml(d)}</span>
            <span style="display:inline-flex;gap:1px;align-items:center;flex-shrink:0">${starsHtml(ax.avg, ax.color)}</span>
            <div style="width:50px;height:4px;background:var(--border);border-radius:3px;overflow:hidden;flex-shrink:0"><div style="width:${ax.avg}%;height:100%;background:${ax.color}"></div></div>
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:${ax.color};min-width:32px;text-align:right;flex-shrink:0">${ax.avg}%</span>
          </li>`).join("")}
      </ul>
      <div style="font-size:10px;color:var(--muted-fore);margin-top:4px">${ax.n} évaluation${ax.n > 1 ? "s" : ""} dans le périmètre</div>
    </details>`;

  const axesAllHtml = axesData.map(axeRowHtml).join("");

  const optionsHtml = QUALITE_AXES.map(ax =>
    `<option value="${ax.id}">${escapeHtml(ax.id)} — ${escapeHtml(ax.name.replace(/^C\d+\s*—\s*/, ""))}</option>`
  ).join("");

  void assocHtml;
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 2px 10px;border-bottom:1px dashed var(--border);margin-bottom:8px">
      <div style="font-size:11px;color:var(--muted-fore)">${escapeHtml(scopeName)} · <strong>Moyenne ${refs.length} évaluation${refs.length > 1 ? "s" : ""}</strong></div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:800;color:var(--primary)">${globalAvg || "—"}${globalAvg ? "%" : ""}</div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0 8px">
      <div style="font-size:11px;font-weight:700;color:var(--muted-fore);text-transform:uppercase;letter-spacing:.5px">Critères C1 → C10</div>
      <select id="qualAxeSelect" style="font-size:11px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--background);color:var(--foreground);cursor:pointer">
        <option value="__all__">Tous les critères</option>
        ${optionsHtml}
      </select>
    </div>
    <div id="qualAxesContainer">${axesAllHtml}</div>`;
}

export function buildDashboardPayload(data: DashboardData, filters: DashboardFilters) {
  const years = Array.from(new Set(
    data.actions.map(a => a.annee ?? (a.date_debut ? Number(a.date_debut.slice(0, 4)) : null))
      .filter((y): y is number => typeof y === "number" && !Number.isNaN(y))
  )).sort((a, b) => b - a);
  const themes = Array.from(new Set(
    data.actions.map(a => a.thematique).filter((t): t is string => !!t)
  )).sort((a, b) => a.localeCompare(b, "fr"));
  const assocs = data.associations
    .slice()
    .sort((a, b) => (a.nom ?? "").localeCompare(b.nom ?? "", "fr"))
    .map(a => ({ id: a.id, nom: a.nom }));
  const actionsMeta = data.actions
    .slice()
    .sort((a, b) => (a.titre ?? "").localeCompare(b.titre ?? "", "fr"))
    .map(a => ({ id: a.id, titre: a.titre, assoc_id: a.assoc_id, thematique: a.thematique, annee: a.annee ?? (a.date_debut ? Number(a.date_debut.slice(0, 4)) : null) }));
  return {
    type: "ab-supabase-dashboard" as const,
    html: {
      stats: statsHtml(data, filters),
      actions: actionsListHtml(data, filters),
      allActions: allActionsByThemeHtml(data, filters),
      timeline: timelineHtml(data, filters),
      qualite: qualiteHtml(data, filters),
    },
    meta: { years, themes, assocs, actions: actionsMeta, selected: { year: filters.year ?? null, assocId: filters.assocId ?? null, thematique: filters.thematique ?? null, actionId: filters.actionId ?? null } },
  };
}
