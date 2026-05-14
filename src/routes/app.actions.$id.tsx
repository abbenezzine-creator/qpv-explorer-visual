import { createFileRoute, Link, redirect, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";
import {
  AXIS_OPTIONS,
  QPV_OPTIONS,
  STATUT_OPTIONS,
  STATUT_VARIANT,
  canEditAction,
  fetchActionById,
  fetchAssociations,
  fetchEvaluationsForAction,
  labelOf,
} from "@/lib/actions-data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { ActionFormDialog } from "@/components/actions/ActionFormDialog";

export const Route = createFileRoute("/app/actions/$id")({
  validateSearch: (s: Record<string, unknown>) => ({ from: typeof s.from === "string" ? s.from : undefined }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: ActionDetailPage,
});

function ActionDetailPage() {
  const { id } = useParams({ from: "/app/actions/$id" });
  const { from } = Route.useSearch();
  const fromDashboard = from === "dashboard";
  const user = getUser();
  const [editOpen, setEditOpen] = useState(false);

  const actionQ = useQuery({ queryKey: ["action", id], queryFn: () => fetchActionById(id) });
  const evalsQ = useQuery({ queryKey: ["evaluations", id], queryFn: () => fetchEvaluationsForAction(id) });
  const assocsQ = useQuery({ queryKey: ["associations"], queryFn: fetchAssociations });

  const action = actionQ.data;
  const editable = canEditAction(user, action ?? null);
  const assoc = assocsQ.data?.find((a) => a.id === action?.assoc_id);

  if (actionQ.isLoading) return <div className="p-6 text-muted-foreground">Chargement…</div>;
  if (!action) return <div className="p-6">Action introuvable. <Link to="/app/actions" className="text-primary">Retour</Link></div>;

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-auto p-6 pb-20" style={{ scrollbarGutter: "stable" }}>
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          {fromDashboard ? (
            <Link to="/app" search={{ page: "dashboard" } as never}><ArrowLeft className="mr-2 h-4 w-4" /> Retour au tableau de bord</Link>
          ) : (
            <Link to="/app/actions"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link>
          )}
        </Button>
        <div className="flex gap-2">
          {editable && (
            <Button asChild>
              <Link to="/app/actions/$id/evaluation" params={{ id: action.id }}>
                <Plus className="mr-2 h-4 w-4" /> Ajouter une évaluation
              </Link>
            </Button>
          )}
          {editable && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Modifier
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-2 flex items-center gap-2">
          <h1 className="text-2xl font-bold">{action.titre}</h1>
          <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUT_VARIANT[action.statut]}`}>
            {labelOf(STATUT_OPTIONS, action.statut)}
          </span>
        </div>
        {action.description && (
          <div className="mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h2>
            <p className="mt-1 whitespace-pre-line text-sm">{action.description}</p>
          </div>
        )}
        {(action as unknown as { objectifs?: string | null }).objectifs && (
          <div className="mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objectifs</h2>
            <p className="mt-1 whitespace-pre-line text-sm">{(action as unknown as { objectifs?: string | null }).objectifs}</p>
          </div>
        )}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
          <div><dt className="text-xs uppercase text-muted-foreground">Association</dt><dd className="font-medium">{assoc?.nom ?? "—"}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">QPV</dt><dd className="font-medium">{labelOf(QPV_OPTIONS, action.qpv_key)}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Axe</dt><dd className="font-medium">{labelOf(AXIS_OPTIONS, action.axis_key)}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Date début</dt><dd className="font-medium">{action.date_debut ?? "—"}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Date fin</dt><dd className="font-medium">{action.date_fin ?? "—"}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Bénéficiaires prévus</dt><dd className="font-medium">{action.nb_beneficiaires_prevu ?? "—"}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Bénéficiaires réels</dt><dd className="font-medium">{action.nb_beneficiaires_reel ?? "—"}</dd></div>
        </dl>

        {(() => {
          const lines = action.budget_financeurs ?? [];
          if (lines.length === 0) return null;
          const byYear = new Map<string, typeof lines>();
          for (const l of lines) {
            const y = String(l.annee ?? "—");
            if (!byYear.has(y)) byYear.set(y, [] as typeof lines);
            byYear.get(y)!.push(l);
          }
          const years = Array.from(byYear.keys()).sort((a, b) => b.localeCompare(a));
          const fmt = (n: number) => n.toLocaleString("fr-FR") + " €";
          return (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Budgets par année</h2>
              <div className="space-y-4">
                {years.map((y) => {
                  const rows = byYear.get(y)!;
                  const tot = rows.reduce((acc, l) => ({
                    n1: acc.n1 + (Number(l.montant_n1 ?? 0) || 0),
                    sol: acc.sol + (Number(l.montant_sollicite ?? l.montant ?? 0) || 0),
                    fav: acc.fav + (Number(l.montant_favorable ?? 0) || 0),
                  }), { n1: 0, sol: 0, fav: 0 });
                  return (
                    <div key={y} className="rounded-md border border-border">
                      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                        <div className="font-semibold">Année {y}</div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>N-1 : <span className="font-medium text-foreground">{fmt(tot.n1)}</span></span>
                          <span>Sollicité : <span className="font-medium text-foreground">{fmt(tot.sol)}</span></span>
                          <span>Favorable : <span className="font-medium text-foreground">{fmt(tot.fav)}</span></span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs uppercase text-muted-foreground">
                            <tr className="border-b border-border">
                              <th className="px-3 py-2 text-left">Financeur</th>
                              <th className="px-3 py-2 text-left">Type</th>
                              <th className="px-3 py-2 text-right">Année N-1{rows.some(r => r.annee_n1) ? ` (${rows.find(r => r.annee_n1)?.annee_n1})` : ""}</th>
                              <th className="px-3 py-2 text-right">Sollicité</th>
                              <th className="px-3 py-2 text-right">Favorable</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((l, i) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="px-3 py-2">{l.financeur || "—"}</td>
                                <td className="px-3 py-2">{l.type || "—"}</td>
                                <td className="px-3 py-2 text-right">{fmt(Number(l.montant_n1 ?? 0) || 0)}</td>
                                <td className="px-3 py-2 text-right">{fmt(Number(l.montant_sollicite ?? l.montant ?? 0) || 0)}</td>
                                <td className="px-3 py-2 text-right">{fmt(Number(l.montant_favorable ?? 0) || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Évaluations ({evalsQ.data?.length ?? 0})</h2>
        {evalsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (evalsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune évaluation pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {(evalsQ.data ?? []).map((e) => (
              <div key={e.id} className="rounded-md border border-border bg-card p-3 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${e.phase === "avant" ? "border-blue-500/30 bg-blue-500/10 text-blue-700" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"}`}>
                    {e.phase === "avant" ? "Avant" : "Après"}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-FR")}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Bénéficiaire : {e.beneficiaire_nom ?? "Anonyme"}
                  {e.beneficiaire_age ? ` · ${e.beneficiaire_age} ans` : ""}
                  {e.beneficiaire_genre ? ` · ${e.beneficiaire_genre}` : ""}
                </div>
                {e.commentaire && <p className="mt-1 text-sm">{e.commentaire}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <ActionFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
        associations={assocsQ.data ?? []}
        initial={action}
        onSaved={() => actionQ.refetch()}
      />
    </div>
  );
}
