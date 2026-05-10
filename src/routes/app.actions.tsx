import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";
import {
  AXIS_OPTIONS,
  QPV_OPTIONS,
  STATUT_OPTIONS,
  STATUT_VARIANT,
  fetchActions,
  fetchAssociations,
  labelOf,
  canCreateAny,
  canEditAction,
  type Action,
  type Association,
} from "@/lib/actions-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, ClipboardList, Pencil, Search, Trash2, Upload, History } from "lucide-react";
import { ActionFormDialog } from "@/components/actions/ActionFormDialog";
import { ActionsImportDialog } from "@/components/actions/ActionsImportDialog";
import { ActionsRestoreDialog } from "@/components/actions/ActionsRestoreDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/app/actions")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: ActionsListPage,
});

const ALL = "__all__";

function ActionsListPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const user = mounted ? getUser() : null;
  const [editing, setEditing] = useState<Action | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Action | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [q, setQ] = useState("");
  const [fAssoc, setFAssoc] = useState<string>(ALL);
  const [fQpv, setFQpv] = useState<string>(ALL);
  const [fAxis, setFAxis] = useState<string>(ALL);
  const [fStatut, setFStatut] = useState<string>(ALL);

  const assocsQ = useQuery({ queryKey: ["associations"], queryFn: fetchAssociations });
  const actionsQ = useQuery({ queryKey: ["actions"], queryFn: fetchActions });

  const associations: Association[] = assocsQ.data ?? [];
  const assocMap = useMemo(() => {
    const m = new Map<string, string>();
    associations.forEach((a) => m.set(a.id, a.nom));
    return m;
  }, [associations]);
  const assocOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: Association[] = [];
    for (const a of associations) {
      const key = (a.nom ?? "").trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
    }
    return out;
  }, [associations]);

  const filtered = useMemo(() => {
    const list = actionsQ.data ?? [];
    return list.filter((a) => {
      if (fAssoc !== ALL && a.assoc_id !== fAssoc) return false;
      if (fQpv !== ALL && a.qpv_key !== fQpv) return false;
      if (fAxis !== ALL && a.axis_key !== fAxis) return false;
      if (fStatut !== ALL && a.statut !== fStatut) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = `${a.titre} ${a.description ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [actionsQ.data, fAssoc, fQpv, fAxis, fStatut, q]);

  const refresh = () => actionsQ.refetch();
  const canCreate = canCreateAny(user);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Actions</h1>
          <p className="text-sm text-muted-foreground">Pilotage des actions par association</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role === "superadmin" && (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Importer
              </Button>
              <Button variant="outline" onClick={() => setRestoreOpen(true)}>
                <History className="mr-2 h-4 w-4" /> Restaurer
              </Button>
            </>
          )}
          {canCreate && (
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nouvelle action
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-8" />
        </div>
        <Select value={fAssoc} onValueChange={setFAssoc}>
          <SelectTrigger><SelectValue placeholder="Association" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes associations</SelectItem>
            {assocOptions.map((a) => <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fQpv} onValueChange={setFQpv}>
          <SelectTrigger><SelectValue placeholder="QPV" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous QPV</SelectItem>
            {QPV_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fAxis} onValueChange={setFAxis}>
          <SelectTrigger><SelectValue placeholder="Axe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous axes</SelectItem>
            {AXIS_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatut} onValueChange={setFStatut}>
          <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous statuts</SelectItem>
            {STATUT_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Titre</th>
              <th className="px-3 py-2">Association</th>
              <th className="px-3 py-2">QPV</th>
              <th className="px-3 py-2">Axe</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Dates</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {actionsQ.isLoading && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Chargement…</td></tr>
            )}
            {!actionsQ.isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Aucune action ne correspond aux filtres.</td></tr>
            )}
            {filtered.map((a) => {
              const editable = canEditAction(user, a);
              return (
                <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{a.titre}</td>
                  <td className="px-3 py-2">{assocMap.get(a.assoc_id) ?? "—"}</td>
                  <td className="px-3 py-2">{labelOf(QPV_OPTIONS, a.qpv_key)}</td>
                  <td className="px-3 py-2">{labelOf(AXIS_OPTIONS, a.axis_key)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${STATUT_VARIANT[a.statut]}`}>
                      {labelOf(STATUT_OPTIONS, a.statut)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {a.date_debut ?? "—"} → {a.date_fin ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/app/actions/$id" params={{ id: a.id }}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {editable && (
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/app/actions/$id/evaluation" params={{ id: a.id }}>
                            <ClipboardList className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {editable && (
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setDialogOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {user?.role === "superadmin" && (
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(a)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ActionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={user}
        associations={associations}
        initial={editing}
        onSaved={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette action ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleteTarget?.titre} » sera supprimée définitivement, ainsi que ses évaluations associées. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteTarget) return;
                setDeleting(true);
                try {
                  await supabase.from("evaluations").delete().eq("action_id", deleteTarget.id);
                  const { error } = await supabase.from("actions").delete().eq("id", deleteTarget.id);
                  if (error) throw error;
                  toast.success("Action supprimée");
                  setDeleteTarget(null);
                  refresh();
                } catch (err: any) {
                  toast.error(err?.message ?? "Échec de la suppression");
                } finally {
                  setDeleting(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
