import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { login, requestPasswordReset } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/app", search: { page: "dashboard" } });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setInfo(""); setLoading(true);
    const { user, error } = await login(email, pwd);
    setLoading(false);
    if (!user) {
      setErr(error ?? "Identifiant ou mot de passe incorrect.");
      return;
    }
    navigate({ to: "/app", search: { page: "dashboard" } });
  };

  const onForgot = async () => {
    setErr(""); setInfo("");
    if (!email.trim()) { setErr("Saisissez votre email pour réinitialiser le mot de passe."); return; }
    const { ok, error } = await requestPasswordReset(email);
    if (!ok) { setErr(error ?? "Impossible d'envoyer l'email."); return; }
    setInfo("Email de réinitialisation envoyé. Vérifiez votre boîte de réception.");
  };

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">AssocioBoard</h1>
            <p className="text-xs text-muted-foreground">Connexion à votre espace</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus autoComplete="email"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="vous@exemple.fr"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mot de passe</label>
            <input
              type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          {err && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>
          )}
          {info && (
            <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">{info}</div>
          )}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
            <LogIn className="h-4 w-4" /> {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs">
          <button type="button" onClick={onForgot} className="text-primary hover:underline">
            Mot de passe oublié ?
          </button>
          <Link to="/signup" className="text-primary hover:underline">
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  );
}
