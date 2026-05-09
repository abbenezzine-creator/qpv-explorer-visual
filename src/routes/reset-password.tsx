import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { updatePassword } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase appends a recovery token in the URL hash and signs the user in
    // automatically via onAuthStateChange (PASSWORD_RECOVERY event).
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Also handle the case where the session is already restored.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setInfo("");
    if (pwd.length < 8) { setErr("Le mot de passe doit faire au moins 8 caractères."); return; }
    if (pwd !== pwd2) { setErr("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    const { ok, error } = await updatePassword(pwd);
    setLoading(false);
    if (!ok) { setErr(error ?? "Erreur lors de la mise à jour."); return; }
    setInfo("Mot de passe mis à jour. Redirection…");
    setTimeout(() => navigate({ to: "/app", search: { page: "dashboard" } }), 1200);
  };

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Nouveau mot de passe</h1>
            <p className="text-xs text-muted-foreground">Définissez un mot de passe sécurisé</p>
          </div>
        </div>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Vérification du lien de réinitialisation…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nouveau mot de passe</label>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Au moins 8 caractères" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirmer</label>
              <input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} autoComplete="new-password" required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="••••••••" />
            </div>
            {err && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}
            {info && <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">{info}</div>}
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
              <KeyRound className="h-4 w-4" /> {loading ? "Mise à jour…" : "Mettre à jour"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
