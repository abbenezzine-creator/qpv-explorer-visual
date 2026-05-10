import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download, RotateCcw, X, Plus, Upload } from "lucide-react";

type Snapshot = {
  id: string;
  label: string;
  created_at: string;
  count: number;
  rows: any[];
};

const STORAGE_KEY = "ab.actions.snapshots";

function load(): Snapshot[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function save(list: Snapshot[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

type Props = { open: boolean; onOpenChange: (o: boolean) => void; onRestored: () => void };

export function ActionsRestoreDialog({ open, onOpenChange, onRestored }: Props) {
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setSnaps(load()); }, [open]);

  const createSnapshot = async (label?: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.from("actions").select("*");
      if (error) throw error;
      const snap: Snapshot = {
        id: crypto.randomUUID(),
        label: label || new Date().toLocaleString("fr-FR"),
        created_at: new Date().toISOString(),
        count: data?.length ?? 0,
        rows: data ?? [],
      };
      const list = [snap, ...load()];
      save(list); setSnaps(list);
      toast.success(`Sauvegarde créée (${snap.count} actions)`);
    } catch (e: any) { toast.error(e?.message ?? "Échec"); }
    finally { setBusy(false); }
  };

  const download = (s: Snapshot) => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `actions-${s.created_at.slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (f: File) => {
    try {
      const txt = await f.text();
      const parsed = JSON.parse(txt);
      const rows = Array.isArray(parsed) ? parsed : parsed.rows;
      if (!Array.isArray(rows)) throw new Error("Fichier invalide");
      const snap: Snapshot = {
        id: crypto.randomUUID(),
        label: `Importé — ${f.name}`,
        created_at: new Date().toISOString(),
        count: rows.length, rows,
      };
      const list = [snap, ...load()];
      save(list); setSnaps(list);
      toast.success(`Sauvegarde importée (${rows.length} actions)`);
    } catch (e: any) { toast.error(e?.message ?? "Fichier invalide"); }
  };

  const restore = async (s: Snapshot) => {
    if (!confirm(`Restaurer « ${s.label} » ?\n\nUne sauvegarde de l'état actuel sera créée avant la restauration. Toutes les actions actuelles seront remplacées par celles de la sauvegarde.`)) return;
    setBusy(true);
    try {
      await createSnapshot(`Avant restauration — ${new Date().toLocaleString("fr-FR")}`);
      // Delete all evaluations, then all actions, then re-insert
      await supabase.from("evaluations").delete().not("id", "is", null);
      await supabase.from("actions").delete().not("id", "is", null);
      const cleaned = s.rows.map((r) => {
        const { id, created_at, updated_at, ...rest } = r;
        return { id, ...rest };
      });
      for (let i = 0; i < cleaned.length; i += 200) {
        const { error } = await supabase.from("actions").insert(cleaned.slice(i, i + 200));
        if (error) throw error;
      }
      toast.success(`Restauration réussie (${cleaned.length} actions)`);
      onRestored();
      onOpenChange(false);
    } catch (e: any) { toast.error(e?.message ?? "Échec de la restauration"); }
    finally { setBusy(false); }
  };

  const remove = (id: string) => {
    if (!confirm("Supprimer cette sauvegarde ?")) return;
    const list = load().filter((s) => s.id !== id);
    save(list); setSnaps(list);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sauvegardes des actions</DialogTitle>
          <DialogDescription>
            Créez une sauvegarde de l'état actuel des actions, ou restaurez une version précédente. Les sauvegardes sont stockées dans ce navigateur.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => createSnapshot()} disabled={busy} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Créer une sauvegarde
          </Button>
          <label className="inline-flex">
            <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.currentTarget.value = ""; }} />
            <span className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
              <Upload className="mr-1 h-4 w-4" /> Importer un fichier
            </span>
          </label>
        </div>

        <div className="space-y-2">
          {snaps.length === 0 && <p className="text-sm text-muted-foreground">Aucune sauvegarde.</p>}
          {snaps.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border bg-card p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.count} action(s) · {new Date(s.created_at).toLocaleString("fr-FR")}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => download(s)} title="Télécharger"><Download className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => restore(s)} disabled={busy}>
                <RotateCcw className="mr-1 h-4 w-4" /> Restaurer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="text-destructive"><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
