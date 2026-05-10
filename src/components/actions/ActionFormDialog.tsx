import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AXIS_OPTIONS, QPV_OPTIONS, STATUT_OPTIONS,
  TYPE_ACTION_OPTIONS, THEMATIQUE_OPTIONS, JOURS_OPTIONS,
  QUARTIERS_OPTIONS, TRANCHES_AGE_OPTIONS, RECURRENCE_OPTIONS,
  type Action, type Association, type AxisKey, type QpvKey, type StatutKey,
  type BudgetLine, type LieuItem,
} from "@/lib/actions-data";
import { supabase } from "@/integrations/supabase/client";
import type { AbUser } from "@/lib/auth";
import { toast } from "sonner";
import { Plus, X, IdCard, CalendarClock, Users, MapPin, Target, Wallet } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: AbUser | null;
  associations: Association[];
  initial?: Action | null;
  onSaved: () => void;
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

function computeDureeAuto(d1: string, d2: string, h1: string, h2: string): string {
  if (d1 && d2) {
    const a = new Date(d1).getTime();
    const b = new Date(d2).getTime();
    if (!isNaN(a) && !isNaN(b) && b >= a) {
      const days = Math.round((b - a) / 86400000) + 1;
      if (days > 1) return `${days} jours`;
    }
  }
  if (h1 && h2) {
    const [h1h, h1m] = h1.split(":").map(Number);
    const [h2h, h2m] = h2.split(":").map(Number);
    if (!isNaN(h1h) && !isNaN(h2h)) {
      const mins = (h2h * 60 + (h2m || 0)) - (h1h * 60 + (h1m || 0));
      if (mins > 0) {
        const h = Math.floor(mins / 60), m = mins % 60;
        return m ? `${h}h${String(m).padStart(2,"0")}` : `${h}h`;
      }
    }
  }
  return "";
}

type SectionProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: "blue" | "amber" | "emerald" | "rose" | "violet" | "primary";
  children: React.ReactNode;
};

const TONE_MAP: Record<SectionProps["tone"], { ring: string; bg: string; chip: string; icon: string }> = {
  blue:    { ring: "border-blue-500/30",    bg: "bg-blue-500/[0.04]",    chip: "bg-blue-500/10 text-blue-700",       icon: "text-blue-600" },
  amber:   { ring: "border-amber-500/30",   bg: "bg-amber-500/[0.04]",   chip: "bg-amber-500/10 text-amber-700",     icon: "text-amber-600" },
  emerald: { ring: "border-emerald-500/30", bg: "bg-emerald-500/[0.04]", chip: "bg-emerald-500/10 text-emerald-700", icon: "text-emerald-600" },
  rose:    { ring: "border-rose-500/30",    bg: "bg-rose-500/[0.04]",    chip: "bg-rose-500/10 text-rose-700",       icon: "text-rose-600" },
  violet:  { ring: "border-violet-500/30",  bg: "bg-violet-500/[0.04]",  chip: "bg-violet-500/10 text-violet-700",   icon: "text-violet-600" },
  primary: { ring: "border-primary/30",     bg: "bg-primary/[0.04]",     chip: "bg-primary/10 text-primary",         icon: "text-primary" },
};

function Section({ icon: Icon, title, tone, children }: SectionProps) {
  const t = TONE_MAP[tone];
  return (
    <section className={`rounded-xl border ${t.ring} ${t.bg} p-4`}>
      <header className="mb-3 flex items-center gap-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${t.chip}`}>
          <Icon className={`h-4 w-4 ${t.icon}`} />
        </span>
        <h3 className="text-sm font-semibold tracking-wide uppercase text-foreground/80">{title}</h3>
      </header>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

export function ActionFormDialog({ open, onOpenChange, user, associations, initial, onSaved }: Props) {
  const isSuperadmin = user?.role === "superadmin";

  const [assocId, setAssocId] = useState("");
  const [typeAction, setTypeAction] = useState<string>("Formation");
  const [titre, setTitre] = useState("");
  const [annee, setAnnee] = useState<string>(String(currentYear));
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [duree, setDuree] = useState("");
  const [jours, setJours] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState("none");
  const [recurrenceDetail, setRecurrenceDetail] = useState("");
  const [recurrenceFin, setRecurrenceFin] = useState("");
  const [recurrenceNb, setRecurrenceNb] = useState("");
  const [thematique, setThematique] = useState<string>("Education / Parentalité");
  const [nbPrevu, setNbPrevu] = useState("");
  const [nbReel, setNbReel] = useState("");
  const [quartiers, setQuartiers] = useState<string[]>([]);
  const [tranchesAge, setTranchesAge] = useState<string[]>([]);
  const [fonctions, setFonctions] = useState<string[]>([""]);
  const [lieux, setLieux] = useState<LieuItem[]>([{ nom: "" }]);
  const [statut, setStatut] = useState<StatutKey>("planifiee");
  const [qpv, setQpv] = useState<QpvKey | "">("");
  const [axis, setAxis] = useState<AxisKey | "">("");
  const [description, setDescription] = useState("");
  const [objectifs, setObjectifs] = useState("");
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([
    { annee: String(currentYear), financeur: "", type: "", montant_sollicite: 0, montant_favorable: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  // sync from initial when opening
  useEffect(() => {
    if (!open) return;
    setAssocId(initial?.assoc_id ?? (isSuperadmin ? associations[0]?.id ?? "" : user?.assocId ?? ""));
    setTypeAction(initial?.type_action ?? "Formation");
    setTitre(initial?.titre ?? "");
    setAnnee(String(initial?.annee ?? currentYear));
    setDateDebut(initial?.date_debut ?? "");
    setDateFin(initial?.date_fin ?? "");
    setHeureDebut(initial?.heure_debut ?? "");
    setHeureFin(initial?.heure_fin ?? "");
    setDuree(initial?.duree ?? "");
    setJours(initial?.jours ?? []);
    setRecurrence(initial?.recurrence ?? "none");
    setRecurrenceDetail(initial?.recurrence_detail ?? "");
    setRecurrenceFin(initial?.recurrence_fin ?? "");
    setRecurrenceNb(initial?.recurrence_nb?.toString() ?? "");
    setThematique(initial?.thematique ?? "Education / Parentalité");
    setNbPrevu(initial?.nb_beneficiaires_prevu?.toString() ?? "");
    setNbReel(initial?.nb_beneficiaires_reel?.toString() ?? "");
    setQuartiers(initial?.quartiers ?? []);
    setTranchesAge(initial?.tranches_age ?? []);
    setFonctions(initial?.fonctions?.length ? initial.fonctions : [""]);
    setLieux(initial?.lieux?.length ? initial.lieux : [{ nom: "" }]);
    setStatut(initial?.statut ?? "planifiee");
    setQpv((initial?.qpv_key as QpvKey) ?? "");
    setAxis((initial?.axis_key as AxisKey) ?? "");
    setDescription(initial?.description ?? "");
    setObjectifs((initial as unknown as { objectifs?: string | null })?.objectifs ?? "");
    setBudgetLines(initial?.budget_financeurs?.length
      ? initial.budget_financeurs.map(b => ({
          annee: b.annee,
          financeur: b.financeur,
          type: b.type,
          montant_sollicite: Number(b.montant_sollicite ?? b.montant ?? 0) || 0,
          montant_favorable: Number(b.montant_favorable ?? 0) || 0,
        }))
      : [{ annee: String(currentYear), financeur: "", type: "", montant_sollicite: 0, montant_favorable: 0 }]);
  }, [open, initial, isSuperadmin, associations, user?.assocId]);

  // auto duree
  useEffect(() => {
    setDuree(computeDureeAuto(dateDebut, dateFin, heureDebut, heureFin));
  }, [dateDebut, dateFin, heureDebut, heureFin]);

  const toggleArr = (val: string, arr: string[], setArr: (v: string[]) => void) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const totalSollicite = budgetLines.reduce((s, l) => s + (Number(l.montant_sollicite) || 0), 0);
  const totalFavorable = budgetLines.reduce((s, l) => s + (Number(l.montant_favorable) || 0), 0);

  const handleSave = async () => {
    if (!titre.trim()) { toast.error("Le titre est obligatoire"); return; }
    if (!assocId) { toast.error("Sélectionnez une association"); return; }
    if (!dateDebut) { toast.error("Date de début obligatoire"); return; }
    setSaving(true);
    const cleanFonctions = fonctions.map(f => f.trim()).filter(Boolean);
    const cleanLieux = lieux.filter(l => l.nom.trim()).map(l => ({ nom: l.nom.trim() }));
    const cleanBudget = budgetLines
      .filter(b => b.financeur.trim() || b.montant_sollicite || b.montant_favorable)
      .map(b => ({
        annee: b.annee,
        financeur: b.financeur,
        type: b.type,
        montant_sollicite: Number(b.montant_sollicite) || 0,
        montant_favorable: Number(b.montant_favorable) || 0,
        montant: Number(b.montant_favorable) || Number(b.montant_sollicite) || 0,
      }));
    const payload = {
      assoc_id: assocId,
      type_action: typeAction,
      titre: titre.trim(),
      annee: Number(annee) || null,
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      heure_debut: heureDebut || null,
      heure_fin: heureFin || null,
      duree: duree || null,
      jours,
      recurrence,
      recurrence_detail: recurrenceDetail || null,
      recurrence_fin: recurrenceFin || null,
      recurrence_nb: recurrenceNb ? Number(recurrenceNb) : null,
      thematique: thematique || null,
      nb_beneficiaires_prevu: nbPrevu ? Number(nbPrevu) : null,
      nb_beneficiaires_reel: nbReel ? Number(nbReel) : null,
      quartiers,
      tranches_age: tranchesAge,
      fonctions: cleanFonctions,
      lieux: cleanLieux,
      lieu_principal: cleanLieux[0]?.nom ?? null,
      statut,
      qpv_key: qpv || null,
      axis_key: axis || null,
      description: description.trim() || null,
      objectifs: objectifs.trim() || null,
      budget: totalFavorable || totalSollicite || null,
      budget_financeurs: cleanBudget,
    };
    const res = initial
      ? await supabase.from("actions").update(payload).eq("id", initial.id)
      : await supabase.from("actions").insert({ ...payload, created_by: user?.id ?? null });
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(initial ? "Action mise à jour" : "Action créée");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'action" : "Ajouter / Modifier une action"}</DialogTitle>
          <DialogDescription>Renseignez les blocs ci-dessous</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* IDENTIFICATION */}
          <Section icon={IdCard} title="Identification" tone="blue">
            <div>
              <Label>Association *</Label>
              <Select value={assocId} onValueChange={setAssocId} disabled={!isSuperadmin}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {associations.map((a) => <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={typeAction} onValueChange={setTypeAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_ACTION_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Titre *</Label>
              <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="ex : Atelier numérique inclusif" />
            </div>
          </Section>

          {/* DÉROULÉ */}
          <Section icon={CalendarClock} title="Déroulé" tone="amber">
            <div>
              <Label>Année</Label>
              <Select value={annee} onValueChange={setAnnee}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date de début *</Label>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div>
              <Label>Date de fin</Label>
              <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
            <div>
              <Label>Heure de début</Label>
              <Input type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
            </div>
            <div>
              <Label>Heure de fin</Label>
              <Input type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
            </div>
            <div>
              <Label>Durée totale</Label>
              <Input value={duree} readOnly className="bg-muted" />
            </div>
            <div className="col-span-2">
              <Label>Jours de la semaine concernés</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {JOURS_OPTIONS.map(j => (
                  <label key={j} className={`flex items-center gap-1 border rounded px-2 py-1 text-sm cursor-pointer ${jours.includes(j) ? "bg-amber-500 text-white border-amber-500" : "bg-background"}`}>
                    <Checkbox checked={jours.includes(j)} onCheckedChange={() => toggleArr(j, jours, setJours)} />
                    {j.slice(0,3)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Récurrence</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {recurrence !== "none" && (
              <div>
                <Label>Détail récurrence</Label>
                <Input value={recurrenceDetail} onChange={(e) => setRecurrenceDetail(e.target.value)} placeholder="ex : 1er et 3e lundi du mois…" />
              </div>
            )}
            {recurrence !== "none" && (
              <>
                <div>
                  <Label>Fin de la récurrence</Label>
                  <Input type="date" value={recurrenceFin} onChange={(e) => setRecurrenceFin(e.target.value)} />
                </div>
                <div>
                  <Label>Nb. d'occurrences</Label>
                  <Input type="number" min={1} value={recurrenceNb} onChange={(e) => setRecurrenceNb(e.target.value)} />
                </div>
              </>
            )}
          </Section>

          {/* PUBLIC */}
          <Section icon={Users} title="Public" tone="emerald">
            <div>
              <Label>Thématique</Label>
              <Select value={thematique} onValueChange={setThematique}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {THEMATIQUE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nb. participants prévus</Label>
              <Input type="number" min={1} value={nbPrevu} onChange={(e) => setNbPrevu(e.target.value)} placeholder="20" />
            </div>
            <div>
              <Label>Bénéficiaires réels</Label>
              <Input type="number" value={nbReel} onChange={(e) => setNbReel(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Tranches d'âge du public</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {TRANCHES_AGE_OPTIONS.map(t => (
                  <label key={t} className={`flex items-center gap-1 border rounded px-2 py-1 text-sm cursor-pointer ${tranchesAge.includes(t) ? "bg-emerald-500 text-white border-emerald-500" : "bg-background"}`}>
                    <Checkbox checked={tranchesAge.includes(t)} onCheckedChange={() => toggleArr(t, tranchesAge, setTranchesAge)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between">
                <Label>Fonctions des intervenants</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setFonctions([...fonctions, ""])}>
                  <Plus className="h-3 w-3 mr-1" />Ajouter
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {fonctions.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={f} onChange={(e) => {
                      const next = [...fonctions]; next[i] = e.target.value; setFonctions(next);
                    }} placeholder="ex : Éducateur spécialisé" />
                    <Button type="button" size="sm" variant="ghost" onClick={() => setFonctions(fonctions.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* LOCALISATION */}
          <Section icon={MapPin} title="Localisation" tone="rose">
            <div className="col-span-2">
              <Label>Quartiers prioritaires</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {QUARTIERS_OPTIONS.map(q => (
                  <label key={q} className={`flex items-center gap-1 border rounded px-2 py-1 text-sm cursor-pointer ${quartiers.includes(q) ? "bg-rose-500 text-white border-rose-500" : "bg-background"}`}>
                    <Checkbox checked={quartiers.includes(q)} onCheckedChange={() => toggleArr(q, quartiers, setQuartiers)} />
                    {q}
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between">
                <Label>Lieux de l'action</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setLieux([...lieux, { nom: "" }])}>
                  <Plus className="h-3 w-3 mr-1" />Ajouter un lieu
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {lieux.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={l.nom} onChange={(e) => {
                      const next = [...lieux]; next[i] = { nom: e.target.value }; setLieux(next);
                    }} placeholder="Salle, adresse complète…" />
                    <Button type="button" size="sm" variant="ghost" onClick={() => setLieux(lieux.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <Label>Lieu principal</Label>
              <Input value={lieux[0]?.nom ?? ""} readOnly className="bg-muted" />
            </div>
          </Section>

          {/* QUALIFICATION DU PROJET */}
          <Section icon={Target} title="Qualification du projet" tone="violet">
            <div>
              <Label>QPV (axe principal)</Label>
              <Select value={qpv} onValueChange={(v) => setQpv(v as QpvKey)}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  {QPV_OPTIONS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Axe stratégique</Label>
              <Select value={axis} onValueChange={(v) => setAxis(v as AxisKey)}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  {AXIS_OPTIONS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Statut</Label>
              <Select value={statut} onValueChange={(v) => setStatut(v as StatutKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUT_OPTIONS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez l'action…" />
            </div>
            <div className="col-span-2">
              <Label>Objectifs</Label>
              <Textarea rows={4} value={objectifs} onChange={(e) => setObjectifs(e.target.value)} placeholder="Quels objectifs poursuit cette action ?" />
            </div>
          </Section>

          {/* BUDGET */}
          <Section icon={Wallet} title="Budget — Financeurs" tone="primary">
            <div className="col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-end gap-3 text-sm">
                <span className="rounded-md bg-blue-500/10 px-2 py-1 font-semibold text-blue-700">
                  Total sollicité : {totalSollicite.toLocaleString("fr-FR")} €
                </span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-700">
                  Total favorable : {totalFavorable.toLocaleString("fr-FR")} €
                </span>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-1 text-xs text-muted-foreground">
                  <div className="col-span-2">Année</div>
                  <div className="col-span-3">Financeur</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Sollicité (€)</div>
                  <div className="col-span-2">Favorable (€)</div>
                  <div className="col-span-1"></div>
                </div>
                {budgetLines.map((b, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-2" type="number" value={b.annee} onChange={(e) => {
                      const n = [...budgetLines]; n[i] = { ...b, annee: e.target.value }; setBudgetLines(n);
                    }} />
                    <Input className="col-span-3" value={b.financeur} placeholder="ex : Orléans Métropole" onChange={(e) => {
                      const n = [...budgetLines]; n[i] = { ...b, financeur: e.target.value }; setBudgetLines(n);
                    }} />
                    <Input className="col-span-2" value={b.type} placeholder="Subvention…" onChange={(e) => {
                      const n = [...budgetLines]; n[i] = { ...b, type: e.target.value }; setBudgetLines(n);
                    }} />
                    <Input className="col-span-2" type="number" value={b.montant_sollicite ?? 0} onChange={(e) => {
                      const n = [...budgetLines]; n[i] = { ...b, montant_sollicite: Number(e.target.value) || 0 }; setBudgetLines(n);
                    }} />
                    <Input className="col-span-2" type="number" value={b.montant_favorable ?? 0} onChange={(e) => {
                      const n = [...budgetLines]; n[i] = { ...b, montant_favorable: Number(e.target.value) || 0 }; setBudgetLines(n);
                    }} />
                    <Button type="button" size="sm" variant="ghost" className="col-span-1" onClick={() => setBudgetLines(budgetLines.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={() => setBudgetLines([...budgetLines, { annee: String(currentYear), financeur: "", type: "", montant_sollicite: 0, montant_favorable: 0 }])}>
                  <Plus className="h-3 w-3 mr-1" />Ajouter un financeur
                </Button>
              </div>
            </div>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : (initial ? "Mettre à jour" : "Ajouter l'action")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
