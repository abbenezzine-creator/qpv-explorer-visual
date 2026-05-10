import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  actionId: string | null;
  onClose: () => void;
};

export function EvalBeneficiaireModal({ actionId, onClose }: Props) {
  const open = !!actionId;
  const qc = useQueryClient();
  const [phase, setPhase] = useState("apres");
  const [nom, setNom] = useState("");
  const [age, setAge] = useState<string>("");
  const [genre, setGenre] = useState("");
  const [satisfaction, setSatisfaction] = useState<string>("4");
  const [commentaire, setCommentaire] = useState("");

  useEffect(() => {
    if (open) {
      setPhase("apres"); setNom(""); setAge(""); setGenre("");
      setSatisfaction("4"); setCommentaire("");
    }
  }, [open]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!actionId) throw new Error("actionId manquant");
      const { error } = await supabase.from("evaluations_beneficiaires").insert({
        action_id: actionId,
        phase,
        beneficiaire_nom: nom || null,
        beneficiaire_age: age ? Number(age) : null,
        beneficiaire_genre: genre || null,
        satisfaction: satisfaction ? Number(satisfaction) : null,
        commentaire: commentaire || null,
        reponses: {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Évaluation enregistrée");
      qc.invalidateQueries({ queryKey: ["dashboard-data"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Évaluer un bénéficiaire</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phase</Label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avant">Avant</SelectItem>
                  <SelectItem value="apres">Après</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Satisfaction (/5)</Label>
              <Input type="number" min={0} max={5} step={0.5} value={satisfaction} onChange={(e) => setSatisfaction(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Nom du bénéficiaire</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Optionnel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Âge</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div>
              <Label>Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">F</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Commentaire</Label>
            <Textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Annuler</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
