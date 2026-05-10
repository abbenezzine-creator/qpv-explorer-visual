import { supabase } from "@/integrations/supabase/client";
import type { AbUser, Role } from "@/lib/auth";

export const QPV_OPTIONS = [
  { key: "argonne", label: "Argonne" },
  { key: "lasource", label: "La Source" },
  { key: "dauphine", label: "Dauphine" },
  { key: "blossieres", label: "Les Blossières" },
] as const;

export const AXIS_OPTIONS = [
  { key: "emancipation", label: "Émancipation" },
  { key: "sante", label: "Santé" },
  { key: "emploi", label: "Emploi" },
  { key: "transition", label: "Transition" },
  { key: "tranquillite", label: "Tranquillité" },
] as const;

export const STATUT_OPTIONS = [
  { key: "planifiee", label: "Planifiée" },
  { key: "en_cours", label: "En cours" },
  { key: "recurrent", label: "Récurrent" },
  { key: "terminee", label: "Terminée" },
  { key: "favorable", label: "Favorable" },
  { key: "non_retenu", label: "Non retenu" },
  { key: "ajournee", label: "Ajournée" },
  { key: "oriente", label: "Orienté vers un autre dispositif" },
  { key: "annulee", label: "Annulée" },
] as const;

export const TYPE_ACTION_OPTIONS = [
  "Formation","Accompagnement","Animation","Permanence","Atelier","Sensibilisation",
] as const;

export const THEMATIQUE_OPTIONS = [
  "Education / Parentalité","Emploi & Développement","Santé","Cohésion sociale","Citoyenneté",
  "Transition écologique","Accès aux droits","Prévention","Culture",
] as const;

export const JOURS_OPTIONS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"] as const;

export const QUARTIERS_OPTIONS = [
  "Argonne","La Source","Blossières","Dauphine",
] as const;

export const TRANCHES_AGE_OPTIONS = [
  "0–5 ans","6–11 ans","12–17 ans","18–25 ans","26–45 ans","46–65 ans","65+ ans","Tout public","Familles",
] as const;

export const RECURRENCE_OPTIONS = [
  { key: "none", label: "Aucune — action ponctuelle" },
  { key: "weekly", label: "Hebdomadaire" },
  { key: "biweekly", label: "Bi-mensuelle (toutes les 2 semaines)" },
  { key: "monthly", label: "Mensuelle" },
  { key: "custom", label: "Personnalisée" },
] as const;

export type BudgetLine = {
  annee: string;
  financeur: string;
  type: string;
  /** legacy single amount (kept for backward compat) */
  montant?: number;
  /** Année N-1 (subvention obtenue année précédente) */
  annee_n1?: string;
  montant_n1?: number;
  montant_sollicite?: number;
  montant_favorable?: number;
};
export type LieuItem = { nom: string };
export type PublicQuartierItem = { quartier: string; nombre: number; type?: "previsionnel" | "realise" };

export type QpvKey = (typeof QPV_OPTIONS)[number]["key"];
export type AxisKey = (typeof AXIS_OPTIONS)[number]["key"];
export type StatutKey = (typeof STATUT_OPTIONS)[number]["key"];

export type Action = {
  id: string;
  assoc_id: string;
  qpv_key: QpvKey | null;
  axis_key: AxisKey | null;
  titre: string;
  description: string | null;
  objectifs: string | null;
  date_debut: string | null;
  date_fin: string | null;
  budget: number | null;
  nb_beneficiaires_prevu: number | null;
  nb_beneficiaires_reel: number | null;
  statut: StatutKey;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  type_action: string | null;
  annee: number | null;
  heure_debut: string | null;
  heure_fin: string | null;
  duree: string | null;
  jours: string[] | null;
  recurrence: string | null;
  recurrence_detail: string | null;
  recurrence_fin: string | null;
  recurrence_nb: number | null;
  thematique: string | null;
  quartiers: string[] | null;
  tranches_age: string[] | null;
  fonctions: string[] | null;
  lieux: LieuItem[] | null;
  lieu_principal: string | null;
  budget_financeurs: BudgetLine[] | null;
  ref?: string | null;
  reference_administrative?: string | null;
  commune?: string | null;
  public_quartiers?: PublicQuartierItem[] | null;
};

export type Association = {
  id: string;
  nom: string;
  description?: string | null;
  commune?: string | null;
  qpv_key?: string | null;
  login?: string | null;
  password?: string | null;
  statut_contact?: string | null;
  contact_nom?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
};

export type Evaluation = {
  id: string;
  action_id: string;
  phase: "avant" | "apres";
  beneficiaire_nom: string | null;
  beneficiaire_age: number | null;
  beneficiaire_genre: string | null;
  reponses: Record<string, unknown>;
  commentaire: string | null;
  created_by: string | null;
  created_at: string;
};

export type ThemeQuestion = {
  id: string;
  type: "text" | "single" | "multi";
  label: string;
  options?: string[];
};

export type Theme = {
  id: string;
  name: string;
  description: string | null;
  questions_before: ThemeQuestion[];
  questions_after: ThemeQuestion[];
};

const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  agent: 1,
  admin_asso: 2,
  superadmin: 3,
};

export function roleAtLeast(user: AbUser | null, min: Role): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[min];
}

export function canEditAction(user: AbUser | null, action: Pick<Action, "assoc_id"> | null): boolean {
  if (!user || !action) return false;
  if (user.role === "superadmin") return true;
  if (user.role === "admin_asso" || user.role === "agent") {
    return user.assocId === action.assoc_id;
  }
  return false;
}

export function canCreateInAssoc(user: AbUser | null, assocId: string | null): boolean {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  if (user.role === "admin_asso" || user.role === "agent") {
    return !!assocId && user.assocId === assocId;
  }
  return false;
}

export function canCreateAny(user: AbUser | null): boolean {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return (user.role === "admin_asso" || user.role === "agent") && !!user.assocId;
}

export function labelOf<T extends { key: string; label: string }>(opts: readonly T[], key: string | null | undefined): string {
  if (!key) return "—";
  return opts.find((o) => o.key === key)?.label ?? key;
}

export const STATUT_VARIANT: Record<StatutKey, string> = {
  planifiee: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  en_cours: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  recurrent: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  terminee: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  favorable: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  non_retenu: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  ajournee: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  oriente: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30",
  annulee: "bg-muted text-muted-foreground border-border",
};

export async function fetchAssociations(): Promise<Association[]> {
  const { data, error } = await supabase.from("associations").select("id, nom").order("nom");
  if (error) throw error;
  return data ?? [];
}

export async function fetchActions(): Promise<Action[]> {
  const { data, error } = await supabase
    .from("actions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Action[];
}

export async function fetchActionById(id: string): Promise<Action | null> {
  const { data, error } = await supabase.from("actions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Action) ?? null;
}

export async function fetchEvaluationsForAction(actionId: string): Promise<Evaluation[]> {
  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .eq("action_id", actionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Evaluation[];
}

export async function fetchThemes(): Promise<Theme[]> {
  const { data, error } = await supabase
    .from("thematic_themes")
    .select("id, name, description, questions_before, questions_after")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    questions_before: (t.questions_before as unknown as ThemeQuestion[]) ?? [],
    questions_after: (t.questions_after as unknown as ThemeQuestion[]) ?? [],
  }));
}
