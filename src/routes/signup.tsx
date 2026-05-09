import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { signup } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/app", search: { page: "dashboard" } });
    }
  },
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setInfo("");
    if (pwd.length < 8) { setErr("Le mot de passe doit faire au moins 8 caractères."); return; }
    if (pwd !== pwd2) { setErr("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    const { ok, needsConfirm, error } = await signup(email, pwd, nom);
    setLoading(false);
    if (!ok) { setErr(error ?? "Inscription impossible."); return; }
    if (needsConfirm) {
      setInfo("Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.");
      return;
    }
    navigate({ to: "/app", search: { page: "dashboard" } });
  };

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Créer un compte</h1>
            <p className="text-xs text-muted-foreground">Accès AssocioBoard</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="Votre nom" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="vous@exemple.fr" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mot de passe</label>
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="Au moins 8 caractères" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirmer le mot de passe</label>
            <input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} autoComplete="new-password" required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="••••••••" />
          </div>
          {err && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}
          {info && <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">{info}</div>}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
            <UserPlus className="h-4 w-4" /> {loading ? "Création…" : "Créer mon compte"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs">
          <Link to="/login" className="text-primary hover:underline">Déjà un compte ? Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
