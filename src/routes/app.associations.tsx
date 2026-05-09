import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";
import { fetchAssociations, QPV_OPTIONS, type Association } from "@/lib/actions-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/associations")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AssociationsPage,
});

type Row = Association & { description?: string | null; commune?: string | null; qpv_key?: string | null };

function AssociationsPage() {
  const user = getUser();
  const isSuper = user?.role === "superadmin";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["associations-full"], queryFn: async () => {
    const { data, error } = await supabase.from("associations").select("*").order("nom");
    if (error) throw error;
    return (data ?? []) as Row[];
  }});

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette association ?")) return;
    const { error } = await supabase.from("associations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimée");
    qc.invalidateQueries({ queryKey: ["associations-full"] });
    qc.invalidateQueries({ queryKey: ["associations"] });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Associations</h1>
          <p className="text-sm text-muted-foreground">Gestion des associations partenaires</p>
        </div>
        {isSuper && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card">
        {q.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Aucune association.</div>
        ) : (
          <ul className="divide-y">
            {(q.data ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="font-medium">{a.nom}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[a.commune, a.qpv_key, a.description].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                {isSuper && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(a); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AssocDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["associations-full"] });
          qc.invalidateQueries({ queryKey: ["associations"] });
        }}
      />
    </div>
  );
}

function AssocDialog({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; initial: Row | null; onSaved: () => void;
}) {
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [commune, setCommune] = useState(initial?.commune ?? "");
  const [qpv, setQpv] = useState(initial?.qpv_key ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

  // reset when opening
  useState(() => undefined);
  if (open && initial && nom === "" && initial.nom) {
    // best-effort sync on open
  }

  const save = async () => {
    if (!nom.trim()) return toast.error("Nom requis");
    setSaving(true);
    const payload = { nom: nom.trim(), commune: commune || null, qpv_key: qpv || null, description: desc || null };
    const res = initial
      ? await supabase.from("associations").update(payload).eq("id", initial.id)
      : await supabase.from("associations").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(initial ? "Mise à jour" : "Créée");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v);
      if (v) {
        setNom(initial?.nom ?? "");
        setCommune(initial?.commune ?? "");
        setQpv(initial?.qpv_key ?? "");
        setDesc(initial?.description ?? "");
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'association" : "Nouvelle association"}</DialogTitle>
          <DialogDescription>Informations générales</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nom *</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div>
            <Label>Commune</Label>
            <Input value={commune ?? ""} onChange={(e) => setCommune(e.target.value)} />
          </div>
          <div>
            <Label>QPV</Label>
            <Select value={qpv ?? ""} onValueChange={setQpv}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                {QPV_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={desc ?? ""} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
