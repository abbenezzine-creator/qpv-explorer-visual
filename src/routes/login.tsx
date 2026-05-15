import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, ShieldCheck, KeyRound, Mail, Eye, EyeOff } from "lucide-react";
import { refreshFromSession } from "@/lib/auth";

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

// Comptes "globaux" qui se connectent par alias plutôt que par enregistrement assoc.
const STATIC_LOGINS: Record<string, { email: string; label: string }> = {
  superadmin: { email: "ab.benezzine@gmail.com", label: "Super Administrateur" },
  partenaire: { email: "partenaire@associoboard.app", label: "Partenaires (lecture seule)" },
};

async function resolveLoginToEmail(loginRaw: string): Promise<string | null> {
  const login = loginRaw.trim();
  if (!login) return null;
  if (login.includes("@")) return login;
  const key = login.toLowerCase();
  if (STATIC_LOGINS[key]) return STATIC_LOGINS[key].email;
  // Résout via la table associations (security-definer RPC)
  const { data } = await supabase.rpc("resolve_login_to_email", { _login: login });
  if (data) return data as string;
  // Fallback : identifiant Partenaire personnalisé → email synthétique
  const id = key.replace(/[^a-z0-9._-]/g, "");
  if (id) return `${id}@partenaire.local`;
  return null;
}

function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setInfo(""); setLoading(true);
    try {
      const email = await resolveLoginToEmail(login);
      if (!email) {
        setErr("Identifiant inconnu. Contactez votre Super Administrateur.");
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pwd });
      if (error || !data.user) {
        setErr("Identifiant ou mot de passe incorrect.");
        return;
      }
      await refreshFromSession();
      navigate({ to: "/app", search: { page: "dashboard" } });
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    setErr(""); setInfo("");
    const key = login.trim().toLowerCase();
    if (!key) { setErr("Saisissez d'abord votre identifiant."); return; }

    // Cas superadmin → flow Supabase classique vers son email
    if (key === "superadmin" || key === STATIC_LOGINS.superadmin.email) {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(
        STATIC_LOGINS.superadmin.email, { redirectTo }
      );
      if (error) { setErr(error.message); return; }
      setInfo("Email de réinitialisation envoyé au Super Administrateur.");
      return;
    }

    // Tous les autres → alerte au superadmin
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("report-access-alert", {
        body: { login: login.trim() },
      });
      if (error) { setErr("Impossible d'envoyer la demande. Réessayez plus tard."); return; }
      setInfo("Une alerte a été envoyée à votre Super Administrateur. Il vous renverra vos accès dans les meilleurs délais.");
      setForgotMode(false);
    } finally {
      setLoading(false);
    }
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
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Identifiant
            </label>
            <input
              type="text" value={login} onChange={(e) => setLogin(e.target.value)} autoFocus autoComplete="username"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="ex : Ajla, Superadmin, Partenaire…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="current-password"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm focus:border-primary focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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

        <div className="mt-4">
          {!forgotMode ? (
            <button
              type="button"
              onClick={() => setForgotMode(true)}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <KeyRound className="h-3 w-3" /> Mot de passe oublié ?
            </button>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-2">
              <p className="text-muted-foreground">
                Si vous êtes <strong>Super Administrateur</strong>, un email de réinitialisation
                vous sera envoyé. Sinon, une alerte sera envoyée au Super Administrateur qui
                vous renverra vos accès.
              </p>
              <div className="flex gap-2">
                <button
                  type="button" onClick={onForgot} disabled={loading}
                  className="flex-1 rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                >
                  <Mail className="h-3 w-3" /> Envoyer la demande
                </button>
                <button
                  type="button" onClick={() => { setForgotMode(false); setErr(""); setInfo(""); }}
                  className="rounded-md border border-border px-3 py-1.5 hover:bg-background"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <a href="/rgpd" className="hover:text-foreground hover:underline">
              Protection des données — RGPD
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
