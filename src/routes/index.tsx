import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { QPVS, CITIZEN_QUOTES, type QPVKey } from "@/data/qpv";
import { StatCard } from "@/components/dashboard/StatCard";
import { QPVSelector } from "@/components/dashboard/QPVSelector";
import { SentimentBar } from "@/components/dashboard/SentimentBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Diagnostic Territorial — QPV Orléans" },
      {
        name: "description",
        content:
          "Tableau de bord interactif des Quartiers Prioritaires de la Ville d'Orléans : données froides, chaudes, citoyennes et évaluation comparative.",
      },
      { property: "og:title", content: "Diagnostic Territorial — QPV Orléans" },
      {
        property: "og:description",
        content:
          "Visualisez l'évolution 2014→2024 des QPV d'Orléans : population, revenu, sécurité, sentiment habitant.",
      },
    ],
  }),
  component: DashboardPage,
});

type Year = 2014 | 2024;

function DashboardPage() {
  const [selected, setSelected] = useState<QPVKey>("argonne");
  const [year, setYear] = useState<Year>(2024);
  const quartier = QPVS.find((q) => q.key === selected)!;

  const popDelta = quartier.population2024 - quartier.population2014;
  const revDelta = quartier.revenue2024 - quartier.revenue2014;

  const evolutionData = useMemo(
    () =>
      QPVS.map((q) => ({
        name: q.short,
        fullName: q.name,
        "Population 2014": q.population2014,
        "Population 2024": q.population2024,
      })),
    [],
  );

  const revenueData = useMemo(
    () =>
      QPVS.map((q) => ({
        name: q.short,
        fullName: q.name,
        "Revenu médian 2014": q.revenue2014,
        "Revenu médian 2024": q.revenue2024,
      })),
    [],
  );

  const radarData = useMemo(
    () => [
      {
        criterion: "Accès aux services",
        ...Object.fromEntries(QPVS.map((q) => [q.name, q.servicesAccess])),
      },
      {
        criterion: "Sentiment de sécurité",
        ...Object.fromEntries(QPVS.map((q) => [q.name, q.safetyFeeling])),
      },
      {
        criterion: "Inverse pauvreté",
        ...Object.fromEntries(QPVS.map((q) => [q.name, 100 - q.povertyRate])),
      },
    ],
    [],
  );

  const radarColors = ["var(--primary)", "var(--hot)", "var(--citizen)", "var(--warning)"];

  const currentPop = year === 2014 ? quartier.population2014 : quartier.population2024;
  const currentRev = year === 2014 ? quartier.revenue2014 : quartier.revenue2024;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-xs font-bold leading-tight text-center">RÉP<br/>FR</span>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Ville d'Orléans · Politique de la Ville
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Diagnostic Territorial — QPV
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-2 w-2 rounded-full bg-success" />
            Source : data.gouv.fr · INSEE · Enquête citoyenne 2023
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Intro + selectors */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Quartier sélectionné : {quartier.name}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {quartier.description}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-border bg-background p-1">
              {[2014, 2024].map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y as Year)}
                  className={
                    "rounded-full px-4 py-1.5 text-sm font-medium transition " +
                    (year === y
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <QPVSelector selected={selected} onSelect={setSelected} />
          </div>
        </section>

        {/* KPI cards */}
        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            category="cold"
            label={`Population (${year})`}
            value={currentPop.toLocaleString("fr-FR")}
            delta={{ value: popDelta, positiveIsGood: true }}
            hint="Évolution 2014 → 2024"
          />
          <StatCard
            category="cold"
            label={`Revenu médian (${year})`}
            value={`${currentRev.toLocaleString("fr-FR")} €`}
            delta={{ value: revDelta, suffix: " €", positiveIsGood: true }}
            hint="Source INSEE / Filosofi"
          />
          <StatCard
            category="hot"
            label="Taux de pauvreté"
            value={`${quartier.povertyRate}%`}
            hint={`Chômage : ${quartier.unemployment}% · -25 ans : ${quartier.under25}%`}
          />
          <StatCard
            category="citizen"
            label="Sentiment de sécurité"
            value={`${quartier.safetyFeeling}/100`}
            hint="Enquête habitants · 2023"
          />
        </section>

        {/* Comparative charts */}
        <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard
            title="Évolution de la population"
            subtitle="Comparaison 2014 / 2024 par QPV"
            badge="Données froides"
            badgeClass="bg-cold/10 text-cold"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  formatter={(v: number) => v.toLocaleString("fr-FR")}
                />
                <Legend />
                <Bar dataKey="Population 2014" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Population 2024" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Évolution du revenu médian"
            subtitle="Revenu annuel par UC, 2014 vs 2024"
            badge="Données froides"
            badgeClass="bg-cold/10 text-cold"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  formatter={(v: number) => `${v.toLocaleString("fr-FR")} €`}
                />
                <Legend />
                <Bar dataKey="Revenu médian 2014" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Revenu médian 2024" fill="var(--cold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        {/* Radar comparatif */}
        <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="Évaluation comparative inter-quartiers"
            subtitle="Pauvreté (inversée) · Sécurité ressentie · Accès aux services"
            badge="Évaluation comparative"
            badgeClass="bg-primary/10 text-primary"
          >
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="criterion" tick={{ fill: "var(--foreground)", fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--muted-foreground)" />
                {QPVS.map((q, i) => (
                  <Radar
                    key={q.key}
                    name={q.name}
                    dataKey={q.name}
                    stroke={radarColors[i]}
                    fill={radarColors[i]}
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                ))}
                <Legend />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={`Sentiment d'évolution — ${quartier.name}`}
            subtitle="Ressenti des habitants entre 2014 et 2024"
            badge="Données citoyennes"
            badgeClass="bg-citizen/10 text-citizen"
          >
            <div className="flex h-full flex-col justify-center gap-6 py-4">
              <SentimentBar {...quartier.sentiment} />
              <div className="rounded-lg bg-muted/50 p-4 text-sm italic text-muted-foreground">
                « {CITIZEN_QUOTES.find((c) => c.quartier === quartier.name)?.quote} »
                <div className="mt-2 not-italic text-xs font-medium text-foreground">
                  — {CITIZEN_QUOTES.find((c) => c.quartier === quartier.name)?.author}
                </div>
              </div>
            </div>
          </ChartCard>
        </section>

        {/* Citizen quotes grid */}
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-lg font-semibold">Paroles d'habitants</h3>
            <span className="text-xs text-muted-foreground">Enquête qualitative · 2023</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {CITIZEN_QUOTES.map((c) => (
              <div
                key={c.quartier}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-2 inline-flex rounded-full bg-citizen/10 px-2 py-0.5 text-xs font-semibold text-citizen">
                  {c.quartier}
                </div>
                <p className="text-sm italic text-foreground">« {c.quote} »</p>
                <p className="mt-3 text-xs text-muted-foreground">— {c.author}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Module de Diagnostic Territorial · Prototype démonstrateur · Données : INSEE / data.gouv.fr / enquête locale
        </footer>
      </main>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  badge,
  badgeClass,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeClass?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
