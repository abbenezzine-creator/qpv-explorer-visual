import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { login, getUser } from "@/lib/auth";
import { LogIn, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && getUser()) {
      throw redirect({ to: "/app", search: { page: "dashboard" } });
    }
  },
  component: LoginPage,
});

const DEMO = [
  { u: "admin",      p: "admin2025",  label: "Super Admin" },
  { u: "action",     p: "action2025", label: "ACTION" },
  { u: "passemploi", p: "pass2025",   label: "PASS'EMPLOI" },
  { u: "atlas",      p: "atlas2025",  label: "ATLAS" },
  { u: "laos",       p: "laos2025",   label: "DES JEUNES DU LAOS" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = login(u, p);
    if (!user) {
      setErr("Identifiant ou mot de passe incorrect.");
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
            <h1 className="text-xl font-bold leading-tight">AssocioBoard</h1>
            <p className="text-xs text-muted-foreground">Connexion à votre espace</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identifiant</label>
            <input
              value={u} onChange={(e) => setU(e.target.value)} autoFocus autoComplete="username"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mot de passe</label>
            <input
              type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          {err && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>
          )}
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
            <LogIn className="h-4 w-4" /> Se connecter
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comptes de démonstration</div>
          <div className="grid grid-cols-1 gap-1.5">
            {DEMO.map((d) => (
              <button
                key={d.u}
                type="button"
                onClick={() => { setU(d.u); setP(d.p); }}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:border-primary hover:bg-accent"
              >
                <span className="font-medium">{d.label}</span>
                <span className="font-mono text-muted-foreground">{d.u} / {d.p}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
