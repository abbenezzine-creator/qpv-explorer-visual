import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/evaluations")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    const { getUser } = await import("@/lib/auth");
    if (getUser()?.role === "partenaire") {
      throw redirect({ to: "/app", search: { page: "impacts-beneficiaires" } });
    }
  },
  component: EvaluationsPage,
});

type Row = {
  id: string;
  action_id: string;
  phase: string;
  beneficiaire_nom: string | null;
  beneficiaire_age: number | null;
  beneficiaire_genre: string | null;
  satisfaction: number | null;
  commentaire: string | null;
  reponses: unknown;
  created_at: string;
};

function EvaluationsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Row | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["evaluations-list"],
    queryFn: async () => {
      const [{ data: evals, error }, { data: actions }, { data: assocs }] = await Promise.all([
        supabase.from("evaluations_beneficiaires")
          .select("id, action_id, phase, beneficiaire_nom, beneficiaire_age, beneficiaire_genre, satisfaction, commentaire, reponses, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("actions").select("id, titre, assoc_id"),
        supabase.from("associations").select("id, nom"),
      ]);
      if (error) throw error;
      return {
        rows: (evals ?? []) as Row[],
        actMap: new Map((actions ?? []).map((a) => [a.id, a as { id: string; titre: string; assoc_id: string }])),
        assocMap: new Map((assocs ?? []).map((a) => [a.id, a.nom])),
      };
    },
  });

  const updateMut = useMutation({
    mutationFn: async (r: Row) => {
      const { error } = await supabase.from("evaluations_beneficiaires").update({
        beneficiaire_nom: r.beneficiaire_nom,
        beneficiaire_age: r.beneficiaire_age,
        beneficiaire_genre: r.beneficiaire_genre,
        satisfaction: r.satisfaction,
        commentaire: r.commentaire,
      }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Évaluation mise à jour");
      qc.invalidateQueries({ queryKey: ["evaluations-list"] });
      qc.invalidateQueries({ queryKey: ["impacts-evaluations"] });
      qc.invalidateQueries({ queryKey: ["dashboard-data"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evaluations_beneficiaires").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Évaluation supprimée");
      qc.invalidateQueries({ queryKey: ["evaluations-list"] });
      qc.invalidateQueries({ queryKey: ["impacts-evaluations"] });
      qc.invalidateQueries({ queryKey: ["dashboard-data"] });
      setDeletingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = list.data?.rows ?? [];
  const actMap = list.data?.actMap;
  const assocMap = list.data?.assocMap;

  const fmt = useMemo(() => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }), []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Évaluations bénéficiaires</CardTitle>
          <p className="text-sm text-muted-foreground">
            Données enregistrées via la modale d'évaluation. Les modifications se répercutent sur la page Impacts bénéficiaires.
          </p>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune évaluation enregistrée.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Association</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Bénéficiaire</TableHead>
                    <TableHead>Âge</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Satisfaction</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const a = actMap?.get(r.action_id);
                    const assocName = a ? (assocMap?.get(a.assoc_id) ?? "—") : "—";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{fmt.format(new Date(r.created_at))}</TableCell>
                        <TableCell className="text-sm">{assocName}</TableCell>
                        <TableCell className="text-sm">{a?.titre ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.beneficiaire_nom ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.beneficiaire_age ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.beneficiaire_genre ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.satisfaction != null ? `${r.satisfaction}/5` : "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeletingId(r.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier l'évaluation</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>Nom du bénéficiaire</Label>
                <Input value={editing.beneficiaire_nom ?? ""} onChange={(e) => setEditing({ ...editing, beneficiaire_nom: e.target.value || null })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label>Âge</Label>
                  <Input type="number" value={editing.beneficiaire_age ?? ""} onChange={(e) => setEditing({ ...editing, beneficiaire_age: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div className="grid gap-1">
                  <Label>Genre</Label>
                  <Input value={editing.beneficiaire_genre ?? ""} onChange={(e) => setEditing({ ...editing, beneficiaire_genre: e.target.value || null })} />
                </div>
              </div>
              <div className="grid gap-1">
                <Label>Satisfaction (/5)</Label>
                <Input type="number" step="0.1" min="0" max="5" value={editing.satisfaction ?? ""} onChange={(e) => setEditing({ ...editing, satisfaction: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="grid gap-1">
                <Label>Commentaire</Label>
                <Textarea value={editing.commentaire ?? ""} onChange={(e) => setEditing({ ...editing, commentaire: e.target.value || null })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={() => editing && updateMut.mutate(editing)} disabled={updateMut.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette évaluation ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMut.mutate(deletingId)}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
