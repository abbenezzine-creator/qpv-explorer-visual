import { createFileRoute, Link, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";
import {
  QUARTIERS_OPTIONS,
  canEditAction,
  fetchActionById,
  fetchThemes,
  type ThemeQuestion,
} from "@/lib/actions-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/actions/$id/evaluation")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: EvaluationFormPage,
});

function EvaluationFormPage() {
  const { id } = useParams({ from: "/app/actions/$id/evaluation" });
  const user = getUser();
  const navigate = useNavigate();

  const actionQ = useQuery({ queryKey: ["action", id], queryFn: () => fetchActionById(id) });
  const themesQ = useQuery({ queryKey: ["themes"], queryFn: fetchThemes });

  const action = actionQ.data;
  const themes = themesQ.data ?? [];

  const matchedTheme = useMemo(() => {
    if (!action?.thematique) return null;
    const t = action.thematique.toLowerCase();
    return themes.find((th) => th.name.toLowerCase() === t)
      ?? themes.find((th) => th.name.toLowerCase().includes(t) || t.includes(th.name.toLowerCase()))
      ?? null;
  }, [action?.thematique, themes]);

  const [themeId, setThemeId] = useState<string>("");
  useEffect(() => {
    if (matchedTheme && !themeId) setThemeId(matchedTheme.id);
  }, [matchedTheme, themeId]);

  const theme = themes.find((t) => t.id === themeId) ?? null;
  const [phase, setPhase] = useState<"avant" | "apres">("avant");
  const [nom, setNom] = useState("");
  const [age, setAge] = useState("");
  const [genre, setGenre] = useState("");
  const [quartier, setQuartier] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const questions: ThemeQuestion[] = theme ? (phase === "avant" ? theme.questions_before : theme.questions_after) : [];

  useEffect(() => { setAnswers({}); }, [themeId, phase]);

  if (actionQ.isLoading) return <div className="p-6 text-muted-foreground">Chargement…</div>;
  if (!action) return <div className="p-6">Action introuvable.</div>;

  const editable = canEditAction(user, action);
  if (!editable) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Vous n'avez pas les droits pour évaluer cette action.</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link to="/app/actions/$id" params={{ id }}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link>
        </Button>
      </div>
    );
  }

  const setAnswer = (qid: string, value: unknown) => setAnswers((p) => ({ ...p, [qid]: value }));

  const submit = async () => {
    setSaving(true);
    const { error } = await supabase.from("evaluations").insert({
      action_id: id,
      phase,
      beneficiaire_nom: nom.trim() || null,
      beneficiaire_age: age ? Number(age) : null,
      beneficiaire_genre: genre || null,
      reponses: { theme_id: themeId || null, theme_name: theme?.name ?? null, quartier: quartier || null, answers } as never,
      commentaire: commentaire.trim() || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Évaluation enregistrée");
    navigate({ to: "/app/actions/$id", params: { id } });
  };

  return (
    <div className="p-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/app/actions/$id" params={{ id }}><ArrowLeft className="mr-2 h-4 w-4" /> Retour à l'action</Link>
      </Button>

      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="mb-1 text-xl font-bold">Nouvelle évaluation</h1>
        <p className="mb-4 text-sm text-muted-foreground">{action.titre}</p>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label>Phase</Label>
            <Select value={phase} onValueChange={(v) => setPhase(v as "avant" | "apres")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avant">Avant l'action</SelectItem>
                <SelectItem value="apres">Après l'action</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Thématique</Label>
            <Select value={themeId} onValueChange={setThemeId}>
              <SelectTrigger><SelectValue placeholder="Choisir une thématique…" /></SelectTrigger>
              <SelectContent>
                {themes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label>Bénéficiaire (nom)</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Optionnel (anonymat)" />
          </div>
          <div>
            <Label>Âge</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div>
            <Label>Genre</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="F">Femme</SelectItem>
                <SelectItem value="H">Homme</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quartier</Label>
            <Select value={quartier} onValueChange={setQuartier}>
              <SelectTrigger><SelectValue placeholder="Choisir un quartier…" /></SelectTrigger>
              <SelectContent>
                {QUARTIERS_OPTIONS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-4 space-y-4 rounded-md border border-border bg-muted/20 p-4">
          <h2 className="text-sm font-semibold">Questions — {phase === "avant" ? "Avant" : "Après"}</h2>
          {!theme && <p className="text-sm text-muted-foreground">Sélectionnez une thématique pour afficher les questions.</p>}
          {theme && questions.length === 0 && <p className="text-sm text-muted-foreground">Aucune question {phase === "avant" ? "avant" : "après"} configurée pour cette thématique.</p>}
          {questions.map((q) => (
            <div key={q.id}>
              <Label className="mb-1 block">{q.label}</Label>
              {q.type === "text" && (
                <Textarea value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} rows={2} />
              )}
              {q.type === "single" && (
                <div className="flex flex-wrap gap-3">
                  {(q.options ?? []).map((o) => (
                    <label key={o} className="inline-flex items-center gap-1 text-sm">
                      <input type="radio" name={`q_${q.id}`} value={o} checked={answers[q.id] === o} onChange={() => setAnswer(q.id, o)} />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === "multi" && (
                <div className="flex flex-wrap gap-3">
                  {(q.options ?? []).map((o) => {
                    const arr = (answers[q.id] as string[]) ?? [];
                    const checked = arr.includes(o);
                    return (
                      <label key={o} className="inline-flex items-center gap-1 text-sm">
                        <input type="checkbox" checked={checked} onChange={(e) => {
                          const next = e.target.checked ? [...arr, o] : arr.filter((x) => x !== o);
                          setAnswer(q.id, next);
                        }} />
                        <span>{o}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mb-4">
          <Label>Commentaire</Label>
          <Textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3} />
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer l'évaluation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
