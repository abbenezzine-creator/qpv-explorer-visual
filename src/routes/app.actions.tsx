import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";
import {
  QPV_OPTIONS,
  STATUT_OPTIONS,
  STATUT_VARIANT,
  THEMATIQUE_OPTIONS,
  actionStartDate,
  actionEndDate,
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
import { Plus, Eye, ClipboardList, Pencil, Search, Trash2, Upload, History, ArrowLeft, FileText } from "lucide-react";
import { ActionFormDialog } from "@/components/actions/ActionFormDialog";
import { ActionsImportDialog } from "@/components/actions/ActionsImportDialog";
import { ActionsRestoreDialog } from "@/components/actions/ActionsRestoreDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ThemeBadge } from "@/components/ThemeBadge";
import { useSidebar } from "@/components/ui/sidebar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const FR_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
function frDate(s: string | null | undefined): string {
  if (!s) return "—";
  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = isoDate
    ? new Date(Date.UTC(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3])))
    : new Date(s);
  if (isNaN(d.getTime())) return s;
  return FR_DATE.format(d);
}

export const Route = createFileRoute("/app/actions")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  validateSearch: (s: Record<string, unknown>) => ({
    view: typeof s.view === "string" && s.view ? s.view : undefined,
    edit: typeof s.edit === "string" && s.edit ? s.edit : undefined,
    from: typeof s.from === "string" && s.from ? s.from : undefined,
  }),
  component: ActionsListPage,
});

const ALL = "__all__";
const QPV_ORLEANS = "__qpv_orleans__";
const ORLEANS_QPV_KEYS = ["argonne", "lasource", "dauphine", "blossieres"];

import { themeHex } from "@/components/ThemeBadge";
function thematiqueColor(t: string | null | undefined): string {
  return t ? themeHex(t) : "transparent";
}

function ActionsListPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const user = mounted ? getUser() : null;
  const { state: sidebarState, isMobile } = useSidebar();
  const sidebarOffset = isMobile ? "0px" : (sidebarState === "collapsed" ? "3rem" : "16rem");
  const [editing, setEditing] = useState<Action | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Action | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [q, setQ] = useState("");
  const [fAssoc, setFAssoc] = useState<string>(ALL);
  const [fQpv, setFQpv] = useState<string>(ALL);
  const [fThematique, setFThematique] = useState<string>(ALL);
  const [viewing, setViewing] = useState<Action | null>(null);
  const [viewOrigin, setViewOrigin] = useState<string | null>(null);
  const [fStatut, setFStatut] = useState<string>(ALL);

  const assocsQ = useQuery({ queryKey: ["associations"], queryFn: fetchAssociations });
  const actionsQ = useQuery({ queryKey: ["actions"], queryFn: fetchActions });

  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/app/actions" });
  useEffect(() => {
    if (!actionsQ.data) return;
    if (search.view) {
      const a = actionsQ.data.find((x) => x.id === search.view);
      if (a) { setViewing(a); setViewOrigin(search.from ?? null); navigate({ search: {} as never, replace: true }); }
    } else if (search.edit) {
      const a = actionsQ.data.find((x) => x.id === search.edit);
      if (a) { setEditing(a); setDialogOpen(true); navigate({ search: {} as never, replace: true }); }
    }
  }, [actionsQ.data, search.view, search.edit, search.from, navigate]);

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

  const assocById = useMemo(() => {
    const m = new Map<string, Association>();
    associations.forEach((a) => m.set(a.id, a));
    return m;
  }, [associations]);

  const thematiqueOptions = useMemo(() => {
    const set = new Set<string>();
    (actionsQ.data ?? []).forEach((a) => {
      const t = (a.thematique ?? "").trim();
      if (t) set.add(t);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [actionsQ.data]);

  const filtered = useMemo(() => {
    const list = actionsQ.data ?? [];
    return list.filter((a) => {
      if (fAssoc !== ALL && a.assoc_id !== fAssoc) return false;
      if (fQpv === QPV_ORLEANS) {
        const assoc = assocById.get(a.assoc_id);
        const key = assoc?.qpv_key ?? a.qpv_key;
        if (!key || !ORLEANS_QPV_KEYS.includes(key)) return false;
      } else if (fQpv !== ALL && a.qpv_key !== fQpv) return false;
      if (fThematique !== ALL && a.thematique !== fThematique) return false;
      if (fStatut !== ALL && a.statut !== fStatut) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = `${a.titre} ${a.description ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [actionsQ.data, fAssoc, fQpv, fThematique, fStatut, q, assocById]);

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
            <SelectItem value={QPV_ORLEANS}>QPV d'Orléans (Argonne, La Source, Dauphine, Les Blossières)</SelectItem>
            {QPV_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fThematique} onValueChange={setFThematique}>
          <SelectTrigger><SelectValue placeholder="Thématique" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes thématiques</SelectItem>
            {thematiqueOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
              <th className="px-3 py-2">Année</th>
              <th className="px-3 py-2">Titre</th>
              <th className="px-3 py-2">Association</th>
              <th className="px-3 py-2">Dates</th>
              <th className="px-3 py-2">Description / Objectifs</th>
              <th className="px-3 py-2 text-right">Sollicité</th>
              <th className="px-3 py-2">QPV</th>
              <th className="px-3 py-2">Thématique</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Évaluation</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {actionsQ.isLoading && (
              <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">Chargement…</td></tr>
            )}
            {!actionsQ.isLoading && filtered.length === 0 && (
              <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">Aucune action ne correspond aux filtres.</td></tr>
            )}
            {filtered.map((a) => {
              const editable = canEditAction(user, a);
              const sollicite = (a.budget_financeurs ?? []).reduce((s, l) => s + (Number(l.montant_sollicite ?? l.montant ?? 0) || 0), 0);
              const dateDebut = actionStartDate(a);
              const dateFin = actionEndDate(a);
              return (
                <tr
                  key={a.id}
                  className="border-t border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => setViewing(a)}
                >
                  <td
                    className="px-3 py-2 font-semibold text-primary"
                    style={{ boxShadow: `inset 4px 0 0 0 ${thematiqueColor(a.thematique)}` }}
                  >{a.annee ?? "—"}</td>
                  <td className="px-3 py-2 font-medium">{a.titre}</td>
                  <td className="px-3 py-2">{assocMap.get(a.assoc_id) ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    <div><span className="text-foreground/70">Début :</span> {frDate(dateDebut)}</div>
                    <div><span className="text-foreground/70">Fin :</span> {frDate(dateFin)}</div>
                  </td>
                  <td className="px-3 py-2 max-w-[24rem] align-top">
                    {(a.description || a.objectifs) ? (
                      <div className="text-sm">
                        <div className="line-clamp-3 whitespace-pre-line">
                          {a.description}
                          {a.description && a.objectifs ? "\n" : ""}
                          {a.objectifs ? <><span className="font-medium">Objectifs : </span>{a.objectifs}</> : null}
                        </div>
                        <button
                          type="button"
                          className="mt-1 text-xs font-medium text-primary hover:underline"
                          onClick={(e) => { e.stopPropagation(); setViewing(a); }}
                        >
                          Voir détail
                        </button>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{sollicite ? `${sollicite.toLocaleString("fr-FR")} €` : "—"}</td>
                  <td className="px-3 py-2">{labelOf(QPV_OPTIONS, a.qpv_key)}</td>
                  <td className="px-3 py-2">{a.thematique ? <ThemeBadge thematique={a.thematique} /> : "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${STATUT_VARIANT[a.statut]}`}>
                      {labelOf(STATUT_OPTIONS, a.statut)}
                    </span>
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button asChild size="icon" variant="ghost" title="Référentiel Qualité — évaluer l'action" className="h-10 w-10 text-red-600 hover:text-red-700 hover:bg-red-50 animate-pulse">
                        <Link to="/app" search={{ page: "qualite", qualiteAction: a.id }}>
                          <FileText className="!h-7 !w-7" />
                          <span className="sr-only">Référentiel Qualité</span>
                        </Link>
                      </Button>
                      <Button asChild size="icon" variant="ghost" title="Évaluation bénéficiaire" className="h-10 w-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50 animate-pulse">
                        <Link to="/app/actions/$id/evaluation" params={{ id: a.id }}>
                          <FileText className="!h-7 !w-7" />
                          <span className="sr-only">Évaluation bénéficiaire</span>
                        </Link>
                      </Button>
                    </div>
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(a)} title="Voir en plein écran">
                        <Eye className="h-4 w-4" />
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

      <ActionsImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        associations={associations}
        onImported={refresh}
      />

      <ActionsRestoreDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        onRestored={refresh}
      />

      <ActionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={user}
        associations={associations}
        initial={editing}
        onSaved={refresh}
        thematiqueOptions={thematiqueOptions}
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

      <Dialog open={!!viewing} onOpenChange={(o) => {
        if (!o) {
          const origin = viewOrigin;
          setViewing(null);
          setViewOrigin(null);
          if (origin === "dashboard") {
            navigate({ to: "/app/", search: { page: "dashboard" } as never });
          }
        }
      }}>
        <DialogContent
          className="flex max-w-none sm:rounded-none p-0 gap-0 overflow-hidden top-0 left-0 translate-x-0 translate-y-0 border-0"
          style={{
            width: "100vw",
            height: "100vh",
            maxHeight: "100vh",
          }}
        >
          {viewing && (
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-3">
                <Button variant="ghost" size="sm" onClick={() => {
                  const origin = viewOrigin;
                  setViewing(null);
                  setViewOrigin(null);
                  if (origin === "dashboard") {
                    navigate({ to: "/app/", search: { page: "dashboard" } as never });
                  }
                }}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {viewOrigin === "dashboard" ? "Retour au tableau de bord" : "Retour à la table"}
                </Button>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUT_VARIANT[viewing.statut]}`}>
                    {labelOf(STATUT_OPTIONS, viewing.statut)}
                  </span>
                  {canEditAction(user, viewing) && (
                    <Button size="sm" variant="outline" onClick={() => { setEditing(viewing); setViewing(null); setDialogOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Modifier
                    </Button>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto p-8 pb-20" style={{ scrollbarGutter: "stable" }}>
                <div className="mx-auto min-w-[900px] max-w-5xl space-y-6">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">{viewing.annee ?? ""} · {assocMap.get(viewing.assoc_id) ?? ""}</div>
                    <h2 className="text-3xl font-bold">{viewing.titre}</h2>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
                    <div><dt className="text-xs uppercase text-muted-foreground">Réf. interne</dt><dd className="font-medium">{viewing.ref ?? "—"}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Réf. administrative</dt><dd className="font-medium">{viewing.reference_administrative ?? "—"}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Commune</dt><dd className="font-medium">{viewing.commune ?? "—"}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">QPV</dt><dd className="font-medium">{labelOf(QPV_OPTIONS, viewing.qpv_key)}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Thématique</dt><dd className="mt-1">{viewing.thematique ? <ThemeBadge thematique={viewing.thematique} /> : <span className="font-medium">—</span>}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Type</dt><dd className="font-medium">{viewing.type_action ?? "—"}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Date début</dt><dd className="font-medium">{frDate(actionStartDate(viewing))}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Date fin</dt><dd className="font-medium">{frDate(actionEndDate(viewing))}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Bénéficiaires prévus</dt><dd className="font-medium">{viewing.nb_beneficiaires_prevu ?? "—"}</dd></div>
                  </dl>
                  {viewing.description && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h3>
                      <p className="mt-1 whitespace-pre-line text-sm">{viewing.description}</p>
                    </div>
                  )}
                  {viewing.objectifs && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objectifs</h3>
                      <p className="mt-1 whitespace-pre-line text-sm">{viewing.objectifs}</p>
                    </div>
                  )}
                  {(viewing.public_quartiers ?? []).length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Public touché par quartier</h3>
                      <div className="overflow-hidden rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">Quartier</th><th className="px-3 py-2 text-right">Nombre</th></tr></thead>
                          <tbody>
                            {(viewing.public_quartiers ?? []).map((p, i) => (
                              <tr key={i} className="border-t border-border"><td className="px-3 py-2">{p.quartier}</td><td className="px-3 py-2 text-right">{p.nombre}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {(viewing.budget_financeurs ?? []).length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Budget — Financeurs</h3>
                      <div className="overflow-hidden rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">Année</th><th className="px-3 py-2">Financeur</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Sollicité</th><th className="px-3 py-2 text-right">Favorable</th></tr></thead>
                          <tbody>
                            {(viewing.budget_financeurs ?? []).map((b, i) => (
                              <tr key={i} className="border-t border-border">
                                <td className="px-3 py-2">{b.annee}</td>
                                <td className="px-3 py-2">{b.financeur}</td>
                                <td className="px-3 py-2">{b.type}</td>
                                <td className="px-3 py-2 text-right">{(Number(b.montant_sollicite ?? b.montant ?? 0) || 0).toLocaleString("fr-FR")} €</td>
                                <td className="px-3 py-2 text-right">{(Number(b.montant_favorable ?? 0) || 0).toLocaleString("fr-FR")} €</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
