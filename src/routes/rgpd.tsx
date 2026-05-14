import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Mail, MapPin, ExternalLink, FileText, Scale, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/rgpd")({
  head: () => ({
    meta: [
      { title: "Protection des données — RGPD | Orléans Insights" },
      { name: "description", content: "Mentions RGPD, droits des personnes et politique de protection des données personnelles d'Orléans Insights." },
      { property: "og:title", content: "Protection des données — RGPD" },
      { property: "og:description", content: "Vos droits, le traitement des données et les engagements d'Orléans Métropole en matière de RGPD." },
    ],
  }),
  component: RgpdPage,
});

function RgpdPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/30 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Conformité RGPD
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,oklch(0.65_0.18_260/0.15),transparent_60%),radial-gradient(circle_at_80%_80%,oklch(0.62_0.22_340/0.12),transparent_55%)]" />
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            Règlement (UE) 2016/679 · Loi du 6 janvier 1978 modifiée
          </div>
          <h1 className="mt-5 font-bold tracking-tight text-4xl md:text-6xl">
            Protection de vos
            <span className="block bg-gradient-to-r from-primary to-[oklch(0.62_0.22_340)] bg-clip-text text-transparent">
              données personnelles
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
            Orléans Insights s'engage à protéger vos données personnelles dans le cadre de l'application
            et à respecter pleinement le Règlement Général sur la Protection des Données (RGPD).
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-12 md:py-16 space-y-10">
        {/* Vos droits */}
        <section className="rounded-2xl border border-border bg-card p-7 md:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Vos droits</h2>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground/90">
            Conformément au règlement (UE) 2016/679 et à la loi « informatique et libertés »
            du 6 janvier 1978 modifiée, vous disposez d'un droit&nbsp;:
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { t: "Accès", d: "Consulter les données vous concernant." },
              { t: "Rectification", d: "Corriger les données inexactes." },
              { t: "Opposition", d: "Vous opposer au traitement." },
              { t: "Effacement", d: "Demander la suppression de vos données." },
              { t: "Portabilité", d: "Récupérer vos données dans un format ouvert." },
              { t: "Réclamation", d: "Saisir la CNIL en cas de litige." },
            ].map((r) => (
              <li key={r.t} className="rounded-xl border border-border/70 bg-background/50 p-4">
                <div className="text-sm font-semibold text-primary">{r.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{r.d}</div>
              </li>
            ))}
          </ul>
        </section>

        {/* Contact DPO */}
        <section className="rounded-2xl border border-border bg-card p-7 md:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Délégué à la protection des données</h2>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground/90">
            Pour exercer ces droits ou pour toute question relative au traitement de vos données,
            vous pouvez contacter notre Délégué à la protection des données&nbsp;:
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <a
              href="mailto:dpo@orleans-metropole.fr"
              className="group flex items-start gap-4 rounded-xl border border-border bg-background/50 p-5 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Voie électronique</div>
                <div className="mt-1 font-mono text-sm font-semibold text-foreground group-hover:text-primary">
                  dpo@orleans-metropole.fr
                </div>
              </div>
            </a>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-background/50 p-5">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Voie postale</div>
                <div className="mt-1 text-sm leading-relaxed text-foreground">
                  Orléans Métropole<br />
                  Secrétariat Général<br />
                  5 Place du 6 juin 1944<br />
                  45000 Orléans
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Vous avez également la possibilité d'introduire une réclamation auprès des services de la{" "}
            <a
              href="https://www.cnil.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              CNIL
            </a>.
          </div>
        </section>

        {/* Charte de la donnée */}
        <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-[oklch(0.62_0.22_340)]/5 p-7 md:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Charte de la donnée 2025</h2>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground/90">
            En complément, <strong>Orléans Métropole et la Ville d'Orléans</strong> ont adopté, en 2025,
            une <strong>Charte de la donnée</strong> qui encadre les usages des données sur le territoire.
            Elle fixe un cadre commun fondé sur les principes&nbsp;:
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["Ouverture", "Partage", "Protection des données", "Sobriété numérique"].map((p) => (
              <div
                key={p}
                className="rounded-xl border border-border/70 bg-background/70 p-4 text-center"
              >
                <div className="text-sm font-semibold text-primary">{p}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CNIL & RGPD ressources */}
        <section className="rounded-2xl border border-border bg-card p-7 md:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Pour aller plus loin</h2>
          </div>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            La CNIL (Commission nationale de l'informatique et des libertés) est l'autorité française
            de contrôle en matière de protection des données personnelles.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://www.cnil.fr/fr/comprendre-le-rgpd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Comprendre le RGPD <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href="https://www.cnil.fr/fr/plaintes"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Adresser une plainte <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>

        {/* Mentions application */}
        <section className="rounded-2xl border border-border bg-card p-7 md:p-10 shadow-sm">
          <h2 className="text-2xl font-bold mb-5">Mentions relatives à l'application</h2>
          <dl className="space-y-5 text-[15px]">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsable de traitement</dt>
              <dd className="mt-1 text-foreground/90">Orléans Métropole — 5 Place du 6 juin 1944, 45000 Orléans.</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Finalités</dt>
              <dd className="mt-1 text-foreground/90">
                Pilotage et évaluation des actions associatives menées dans les Quartiers Prioritaires de la Ville (QPV)
                d'Orléans, suivi des bénéficiaires et restitution agrégée à des fins d'analyse territoriale.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base légale</dt>
              <dd className="mt-1 text-foreground/90">
                Mission d'intérêt public dont est investi le responsable de traitement (art. 6.1.e RGPD).
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catégories de données</dt>
              <dd className="mt-1 text-foreground/90">
                Identifiants de connexion, données associatives, données d'activité (actions, évaluations),
                réponses anonymisées aux questionnaires bénéficiaires et habitants.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Durée de conservation</dt>
              <dd className="mt-1 text-foreground/90">
                Données conservées pendant la durée de l'engagement contractuel et archivées conformément aux durées
                légales applicables aux collectivités territoriales.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destinataires</dt>
              <dd className="mt-1 text-foreground/90">
                Personnels habilités d'Orléans Métropole, des associations partenaires et, le cas échéant, des
                prestataires techniques agissant sur instruction du responsable de traitement.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sécurité</dt>
              <dd className="mt-1 text-foreground/90">
                L'application met en œuvre des mesures techniques et organisationnelles (chiffrement en transit,
                cloisonnement par rôles, journalisation, sauvegardes) pour garantir la sécurité des traitements.
              </dd>
            </div>
          </dl>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/30">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            © {new Date().getFullYear()} Orléans Métropole — Orléans Insights
          </div>
          <div className="flex gap-4">
            <Link to="/rgpd" className="hover:text-foreground">RGPD</Link>
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">CNIL</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
