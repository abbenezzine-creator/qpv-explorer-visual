import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AXIS_OPTIONS,
  QPV_OPTIONS,
  STATUT_OPTIONS,
  type Action,
  type Association,
  type AxisKey,
  type QpvKey,
  type StatutKey,
} from "@/lib/actions-data";
import { supabase } from "@/integrations/supabase/client";
import type { AbUser } from "@/lib/auth";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: AbUser | null;
  associations: Association[];
  initial?: Action | null;
  onSaved: () => void;
};

export function ActionFormDialog({ open, onOpenChange, user, associations, initial, onSaved }: Props) {
  const isSuperadmin = user?.role === "superadmin";
  const defaultAssoc = initial?.assoc_id ?? (isSuperadmin ? associations[0]?.id ?? "" : user?.assocId ?? "");

  const [assocId, setAssocId] = useState(defaultAssoc);
  const [titre, setTitre] = useState(initial?.titre ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [qpv, setQpv] = useState<QpvKey | "">((initial?.qpv_key as QpvKey) ?? "");
  const [axis, setAxis] = useState<AxisKey | "">((initial?.axis_key as AxisKey) ?? "");
  const [statut, setStatut] = useState<StatutKey>(initial?.statut ?? "planifiee");
  const [dateDebut, setDateDebut] = useState(initial?.date_debut ?? "");
  const [dateFin, setDateFin] = useState(initial?.date_fin ?? "");
  const [budget, setBudget] = useState(initial?.budget?.toString() ?? "");
  const [nbPrevu, setNbPrevu] = useState(initial?.nb_beneficiaires_prevu?.toString() ?? "");
  const [nbReel, setNbReel] = useState(initial?.nb_beneficiaires_reel?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAssocId(initial?.assoc_id ?? (isSuperadmin ? associations[0]?.id ?? "" : user?.assocId ?? ""));
    setTitre(initial?.titre ?? "");
    setDescription(initial?.description ?? "");
    setQpv((initial?.qpv_key as QpvKey) ?? "");
    setAxis((initial?.axis_key as AxisKey) ?? "");
    setStatut(initial?.statut ?? "planifiee");
    setDateDebut(initial?.date_debut ?? "");
    setDateFin(initial?.date_fin ?? "");
    setBudget(initial?.budget?.toString() ?? "");
    setNbPrevu(initial?.nb_beneficiaires_prevu?.toString() ?? "");
    setNbReel(initial?.nb_beneficiaires_reel?.toString() ?? "");
  }, [open, initial, isSuperadmin, associations, user?.assocId]);

  const handleSave = async () => {
    if (!titre.trim()) { toast.error("Le titre est obligatoire"); return; }
    if (!assocId) { toast.error("Sélectionnez une association"); return; }
    setSaving(true);
    const payload = {
      assoc_id: assocId,
      titre: titre.trim(),
      description: description.trim() || null,
      qpv_key: qpv || null,
      axis_key: axis || null,
      statut,
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      budget: budget ? Number(budget) : null,
      nb_beneficiaires_prevu: nbPrevu ? Number(nbPrevu) : null,
      nb_beneficiaires_reel: nbReel ? Number(nbReel) : null,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'action" : "Nouvelle action"}</DialogTitle>
          <DialogDescription>Renseignez les informations de l'action</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Titre *</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={description ?? ""} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
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
            <Label>Statut</Label>
            <Select value={statut} onValueChange={(v) => setStatut(v as StatutKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUT_OPTIONS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>QPV</Label>
            <Select value={qpv} onValueChange={(v) => setQpv(v as QpvKey)}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                {QPV_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Axe</Label>
            <Select value={axis} onValueChange={(v) => setAxis(v as AxisKey)}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                {AXIS_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date début</Label>
            <Input type="date" value={dateDebut ?? ""} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div>
            <Label>Date fin</Label>
            <Input type="date" value={dateFin ?? ""} onChange={(e) => setDateFin(e.target.value)} />
          </div>
          <div>
            <Label>Budget (€)</Label>
            <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div>
            <Label>Bénéficiaires prévus</Label>
            <Input type="number" value={nbPrevu} onChange={(e) => setNbPrevu(e.target.value)} />
          </div>
          <div>
            <Label>Bénéficiaires réels</Label>
            <Input type="number" value={nbReel} onChange={(e) => setNbReel(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
