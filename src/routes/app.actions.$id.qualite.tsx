import { createFileRoute, Link, redirect, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";
import {
  QPV_OPTIONS,
  STATUT_OPTIONS,
  STATUT_VARIANT,
  canEditAction,
  fetchActionById,
  fetchAssociations,
  labelOf,
} from "@/lib/actions-data";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/actions/$id/qualite")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: ReferentielQualitePage,
});

const CRITERES = [
  { key: "pertinence", label: "Pertinence", hint: "L'action répond-elle à un besoin identifié du quartier ?" },
  { key: "coherence", label: "Cohérence", hint: "L'action est-elle alignée avec les axes du contrat de ville ?" },
  { key: "efficacite", label: "Efficacité", hint: "Les objectifs fixés ont-ils été atteints ?" },
  { key: "efficience", label: "Efficience", hint: "Les moyens mobilisés sont-ils proportionnés aux résultats ?" },
  { key: "impact", label: "Impact", hint: "Quels effets durables sur les bénéficiaires et le quartier ?" },
  { key: "participation", label: "Participation des habitants", hint: "Les habitants sont-ils associés à la conception et au suivi ?" },
  { key: "partenariat", label: "Partenariat", hint: "Qualité et diversité des partenaires mobilisés." },
  { key: "transversalite", label: "Transversalité", hint: "Articulation avec d'autres dispositifs ou actions." },
] as const;

const NOTES = [0, 1, 2, 3, 4] as const;

function ReferentielQualitePage() {
  const { id } = useParams({ from: "/app/actions/$id/qualite" });
  const user = getUser();

  const actionQ = useQuery({ queryKey: ["action", id], queryFn: () => fetchActionById(id) });
  const assocsQ = useQuery({ queryKey: ["associations"], queryFn: fetchAssociations });

  const action = actionQ.data;
  const assoc = useMemo(
    () => assocsQ.data?.find((a) => a.id === action?.assoc_id) ?? null,
    [assocsQ.data, action?.assoc_id],
  );

  const [scores, setScores] = useState<Record<string, number>>({});
  const [synthese, setSynthese] = useState("");
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => Object.values(scores).reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0), [scores]);
  const max = CRITERES.length * 4;

  if (actionQ.isLoading) return <div className="p-6 text-muted-foreground">Chargement…</div>;
  if (!action) {
    return (
      <div className="p-6">
        <p>Action introuvable.</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link to="/app/actions"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link>
        </Button>
      </div>
    );
  }

  const editable = canEditAction(user, action);

  const handleSave = async () => {
    if (!editable) return;
    setSaving(true);
    try {
      // Persist as a generic evaluation row (référentiel qualité) — non-bloquant si la table n'existe pas
      const { error } = await supabase.from("evaluations").insert({
        action_id: action.id,
        kind: "referentiel_qualite",
        payload: { scores, synthese, total, max },
      } as any);
      if (error) throw error;
      toast.success("Référentiel Qualité enregistré");
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-auto p-6 pb-20" style={{ scrollbarGutter: "stable" }}>
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/actions"><ArrowLeft className="mr-2 h-4 w-4" /> Retour aux actions</Link>
        </Button>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUT_VARIANT[action.statut]}`}>
          {labelOf(STATUT_OPTIONS, action.statut)}
        </span>
      </div>

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-red-50 p-2 text-red-600 dark:bg-red-950">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase text-muted-foreground">Référentiel Qualité</div>
              <h1 className="text-2xl font-bold">{action.titre}</h1>
              <div className="mt-1 text-sm text-muted-foreground">
                {assoc?.nom ?? "—"} · {labelOf(QPV_OPTIONS, action.qpv_key)} · {action.thematique ?? "—"} · {action.annee ?? "—"}
              </div>
            </div>
          </div>
          {action.description && (
            <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{action.description}</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-6 py-3 text-sm font-semibold">
            Évaluation par critères <span className="ml-2 text-muted-foreground">(0 = insuffisant · 4 = excellent)</span>
          </div>
          <div className="divide-y divide-border">
            {CRITERES.map((c) => (
              <div key={c.key} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.hint}</div>
                </div>
                <div className="flex items-center gap-1">
                  {NOTES.map((n) => {
                    const active = scores[c.key] === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={!editable}
                        onClick={() => setScores((s) => ({ ...s, [c.key]: n }))}
                        className={`h-9 w-9 rounded-md border text-sm font-medium transition ${
                          active
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-border bg-background hover:bg-muted"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-3 text-sm">
            <span className="text-muted-foreground">Score global</span>
            <span className="font-semibold">{total} / {max}</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <Label htmlFor="synthese" className="text-sm font-semibold">Synthèse qualitative</Label>
          <Textarea
            id="synthese"
            value={synthese}
            onChange={(e) => setSynthese(e.target.value)}
            disabled={!editable}
            placeholder="Points forts, points d'amélioration, recommandations…"
            rows={6}
            className="mt-2"
          />
        </div>

        {editable && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer le référentiel"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
