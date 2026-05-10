import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
  PieChart, Pie, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import {
  AXES, INDICATORS, QPVS, SOURCES, YEARS,
  type AxisKey, type Indicator, type QPVKey,
  indicatorsByAxis, latestValue, valueAt,
} from "@/data/qpv";
import { fetchCitizenSurvey } from "@/lib/citizen-survey.functions";
import { QPVSelector } from "@/components/dashboard/QPVSelector";
import { StatCard } from "@/components/dashboard/StatCard";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, GraduationCap, HeartPulse, Briefcase, Leaf, ShieldCheck, Users,
  type LucideIcon,
} from "lucide-react";

const TAB_ICONS: Record<string, LucideIcon> = {
  synthese: LayoutDashboard,
  emancipation: GraduationCap,
  sante: HeartPulse,
  emploi: Briefcase,
  transition: Leaf,
  tranquillite: ShieldCheck,
  citoyen: Users,
};

const TAB_HINTS: Record<string, string> = {
  synthese: "Vue d'ensemble",
  emancipation: "Éducation · Culture",
  sante: "Soins · Vieillissement",
  emploi: "Insertion · Formation",
  transition: "Énergie · Mobilité",
  tranquillite: "Sécurité · Médiation",
  citoyen: "Voix des habitants",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Diagnostic Territorial QPV — Orléans Métropole 2024-2030" },
      { name: "description", content: "Tableau de bord d'évaluation du Contrat de ville d'Orléans Métropole 2024-2030 : 5 axes, indicateurs INSEE, CAF, ARS, partenaires et participation citoyenne." },
      { property: "og:title", content: "Diagnostic Territorial QPV — Orléans Métropole" },
      { property: "og:description", content: "Visualisez les trajectoires 2014→2030 des QPV : Émancipation, Santé, Emploi, Transition, Tranquillité." },
    ],
  }),
  component: DashboardPage,
});

type Tab = AxisKey | "synthese" | "citoyen";

function DashboardPage() {
  const [selected, setSelected] = useState<QPVKey>("argonne");
  const [tab, setTab] = useState<Tab>("synthese");
  const [year, setYear] = useState<number>(2024);

  const quartier = QPVS.find((q) => q.key === selected)!;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
        {/* Bandeau quartier + année + QPV picker */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Quartier sélectionné · {quartier.commune}
              </div>
              <h2 className="text-2xl font-semibold">{quartier.name}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{quartier.description}</p>
            </div>
            <YearSlider year={year} onChange={setYear} />
          </div>
          <div className="mt-5">
            <QPVSelector selected={selected} onSelect={setSelected} />
          </div>
        </section>

        <Tabs tab={tab} onChange={setTab} />

        <div className="mt-6">
          {tab === "synthese" && <SynthesePane qpv={selected} year={year} />}
          {tab === "citoyen" && <CitoyenPane />}
          {AXES.find((a) => a.key === tab) && (
            <AxisPane axis={tab as AxisKey} qpv={selected} year={year} />
          )}
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Module d'évaluation du Contrat de ville · Orléans Métropole 2024-2030 · Données INSEE,
          CAF, ARS, Préfecture du Loiret, partenaires et enquête citoyenne (Google Sheets).
        </footer>
      </main>
    </div>
  );
}

/* ======================== HEADER ======================== */
function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-4 sm:gap-4 sm:px-6 sm:py-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-[10px] font-bold leading-tight text-center">RÉP<br/>FR</span>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Préfecture du Loiret · Orléans Métropole
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Diagnostic Territorial — Engagements Quartiers 2030
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex h-2 w-2 rounded-full bg-success" />
          INSEE · CAF · ARS · Préfecture · Métropole · Enquête habitants
        </div>
      </div>
    </header>
  );
}

/* ======================== YEAR SLIDER ======================== */
function YearSlider({ year, onChange }: { year: number; onChange: (y: number) => void }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 lg:min-w-[360px]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Année d'observation
        </span>
        <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
          {year}
        </span>
      </div>
      <input
        type="range" min={2014} max={2030} step={1} value={year}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>2014</span><span>2024 · signature CV</span>
        <span className="font-semibold text-foreground">2030</span>
      </div>
    </div>
  );
}

/* ======================== TABS ======================== */
function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { key: Tab; label: string; color?: string }[] = [
    { key: "synthese", label: "Synthèse" },
    ...AXES.map((a) => ({ key: a.key as Tab, label: a.label, color: a.colorVar })),
    { key: "citoyen", label: "Participation citoyenne" },
  ];
  return (
    <nav
      role="tablist"
      aria-label="Sections du diagnostic"
      className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-gradient-to-br from-card to-card/40 p-2 shadow-sm backdrop-blur sm:grid-cols-4 lg:grid-cols-7"
    >
      {items.map((it) => {
        const active = tab === it.key;
        const Icon = TAB_ICONS[it.key] ?? LayoutDashboard;
        const color = it.color ?? "var(--primary)";
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={cn(
              "group relative flex flex-col items-start gap-1.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
              active
                ? "border-transparent text-white shadow-lg ring-1 ring-black/5 scale-[1.02]"
                : "border-border/60 bg-card/60 text-foreground hover:-translate-y-0.5 hover:border-border hover:shadow-md",
            )}
            style={
              active
                ? {
                    background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 70%, black) 100%)`,
                  }
                : undefined
            }
          >
            {/* accent bar */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-0 top-0 h-[3px] transition-opacity",
                active ? "opacity-0" : "opacity-80",
              )}
              style={{ background: color }}
            />
            <span className="flex w-full items-center justify-between gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-white/20 text-white" : "text-foreground",
                )}
                style={
                  active
                    ? undefined
                    : { background: `color-mix(in oklab, ${color} 14%, transparent)`, color }
                }
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest tabular-nums",
                  active ? "text-white/80" : "text-muted-foreground",
                )}
              >
                {String(items.findIndex((x) => x.key === it.key) + 1).padStart(2, "0")}
              </span>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">{it.label}</span>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  active ? "text-white/85" : "text-muted-foreground",
                )}
              >
                {TAB_HINTS[it.key] ?? ""}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ======================== SYNTHÈSE ======================== */
function SynthesePane({ qpv, year }: { qpv: QPVKey; year: number }) {
  // KPI clés transverses
  const kpis: { ind: Indicator }[] = [
    { ind: INDICATORS.find((i) => i.id === "pop")! },
    { ind: INDICATORS.find((i) => i.id === "revenu")! },
    { ind: INDICATORS.find((i) => i.id === "chomage")! },
    { ind: INDICATORS.find((i) => i.id === "pauvrete")! },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ ind }) => (
          <IndicatorCard key={ind.id} ind={ind} qpv={qpv} year={year} />
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <header className="mb-4">
          <h3 className="text-lg font-semibold">Trajectoire 2014 → 2030 — vue d'ensemble</h3>
          <p className="text-sm text-muted-foreground">
            Comparaison des 4 QPV sur l'indicateur clé sélectionné. La ligne verticale indique l'année observée.
          </p>
        </header>
        <TrajectoryChart indicator={INDICATORS.find((i) => i.id === "chomage")!} highlightYear={year} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {AXES.map((a) => {
          const inds = indicatorsByAxis(a.key);
          return (
            <div key={a.key} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="h-1 w-12 rounded-full" style={{ background: a.colorVar }} />
              <h4 className="mt-3 font-semibold">{a.label}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
              <div className="mt-3 text-xs">
                <span className="font-semibold text-foreground">{inds.length}</span>
                <span className="text-muted-foreground"> indicateurs suivis</span>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

/* ======================== AXIS PANE ======================== */
function AxisPane({ axis, qpv, year }: { axis: AxisKey; qpv: QPVKey; year: number }) {
  const axisDef = AXES.find((a) => a.key === axis)!;
  const inds = useMemo(() => indicatorsByAxis(axis), [axis]);
  const [selectedIndId, setSelectedIndId] = useState<string>(inds[0].id);
  const ind = inds.find((i) => i.id === selectedIndId) ?? inds[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-1.5 rounded-full" style={{ background: axisDef.colorVar }} />
            <div>
              <h3 className="text-xl font-semibold">{axisDef.label}</h3>
              <p className="text-sm text-muted-foreground">{axisDef.description}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Indicateur
            </label>
            <select
              value={selectedIndId}
              onChange={(e) => setSelectedIndId(e.target.value)}
              className="min-w-[280px] rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {inds.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label} — {SOURCES[i.source].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QPVS.map((q) => (
          <IndicatorCard key={q.key} ind={ind} qpv={q.key} year={year} compact label={q.name} highlight={q.key === qpv} />
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Trajectoire 2014 → 2030</h3>
            <p className="text-xs text-muted-foreground">{ind.label} ({ind.unit})</p>
          </div>
          <SourceBadge source={ind.source} category={ind.category} />
        </header>
        <TrajectoryChart indicator={ind} highlightYear={year} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <header className="mb-4">
          <h3 className="font-semibold">Comparaison inter-QPV — année {year}</h3>
          <p className="text-xs text-muted-foreground">{ind.label} ({ind.unit})</p>
        </header>
        <ComparisonChart indicator={ind} year={year} />
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Tous les indicateurs de l'axe
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {inds.map((i) => (
            <button
              key={i.id}
              onClick={() => setSelectedIndId(i.id)}
              className={cn(
                "group rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow",
                i.id === selectedIndId && "border-primary",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{i.label}</span>
                <SourceBadge source={i.source} category={i.category} compact />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Dernière donnée pour {QPVS.find((q) => q.key === qpv)!.name} :
                <span className="ml-1 font-semibold text-foreground">
                  {(() => {
                    const lv = latestValue(i, qpv, year);
                    return lv ? `${lv.value.toLocaleString("fr-FR")} ${i.unit} (${lv.year})` : "n.c.";
                  })()}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ======================== INDICATOR CARD ======================== */
function IndicatorCard({
  ind, qpv, year, compact = false, label, highlight,
}: {
  ind: Indicator; qpv: QPVKey; year: number; compact?: boolean; label?: string; highlight?: boolean;
}) {
  const lv = latestValue(ind, qpv, year);
  const v2014 = valueAt(ind, qpv, 2014);
  const delta = lv && v2014 != null ? lv.value - v2014 : null;
  const projected = lv && lv.year < year;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition",
        highlight ? "border-primary ring-2 ring-primary/20" : "border-border",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: AXES.find((a) => a.key === ind.axis)?.colorVar }} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label ?? ind.label}
        </span>
        <SourceBadge source={ind.source} category={ind.category} compact />
      </div>
      {!compact && (
        <div className="mt-2 text-xs text-muted-foreground">{ind.label}</div>
      )}
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-bold text-foreground">
          {lv ? `${lv.value.toLocaleString("fr-FR")}` : "n.c."}
        </div>
        <span className="text-xs text-muted-foreground">{ind.unit}</span>
      </div>
      {delta !== null && lv && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
              (delta > 0) === ind.positiveIsGood
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toLocaleString("fr-FR")} {ind.unit}
          </span>
          <span className="text-muted-foreground">depuis 2014</span>
        </div>
      )}
      {lv && projected && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          dernière mesure : {lv.year}
        </div>
      )}
    </div>
  );
}

/* ======================== SOURCE BADGE ======================== */
function SourceBadge({ source, category, compact = false }: { source: keyof typeof SOURCES; category: string; compact?: boolean }) {
  const cat = category === "froide" ? "bg-cold/15 text-cold"
    : category === "chaude" ? "bg-hot/15 text-hot"
    : category === "citoyenne" ? "bg-citizen/15 text-citizen"
    : "bg-muted text-muted-foreground";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", cat)}>
      {compact ? source : SOURCES[source].label}
    </span>
  );
}

/* ======================== CHARTS ======================== */
function TrajectoryChart({ indicator, highlightYear }: { indicator: Indicator; highlightYear: number }) {
  const data = YEARS.map((y) => {
    const row: Record<string, number | string | null> = { year: y };
    for (const q of QPVS) row[q.short] = indicator.series[q.key][y];
    return row;
  });
  const colors = ["var(--axis-emancipation)", "var(--axis-emploi)", "var(--axis-transition)", "var(--axis-tranquillite)"];
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="year" stroke="var(--muted-foreground)" />
        <YAxis stroke="var(--muted-foreground)" />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
          formatter={(v: number) => `${v?.toLocaleString("fr-FR")} ${indicator.unit}`}
        />
        <Legend />
        <ReferenceLine x={2024} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "Signature CV", position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 10 }} />
        <ReferenceLine x={highlightYear} stroke="var(--primary)" strokeWidth={2} />
        {QPVS.map((q, i) => (
          <Line key={q.key} type="monotone" dataKey={q.short} stroke={colors[i]} strokeWidth={2} dot={false} connectNulls name={q.name} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function ComparisonChart({ indicator, year }: { indicator: Indicator; year: number }) {
  const data = QPVS.map((q) => {
    const lv = latestValue(indicator, q.key, year);
    return { name: q.short, fullName: q.name, value: lv?.value ?? 0, year: lv?.year };
  });
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" stroke="var(--muted-foreground)" />
        <YAxis stroke="var(--muted-foreground)" />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
          formatter={(v: number) => `${v.toLocaleString("fr-FR")} ${indicator.unit}`}
          labelFormatter={(l) => data.find((d) => d.name === l)?.fullName ?? l}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value === max ? "var(--primary)" : "var(--cold)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ======================== PARTICIPATION CITOYENNE ======================== */
const CHART_PALETTE = [
  "var(--axis-emancipation)",
  "var(--axis-emploi)",
  "var(--axis-sante)",
  "var(--axis-transition)",
  "var(--axis-tranquillite)",
  "var(--citizen)",
  "var(--cold)",
  "var(--hot)",
  "var(--primary)",
  "var(--success)",
];

function CitoyenPane() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["citizen-survey"],
    queryFn: () => fetchCitizenSurvey(),
    staleTime: 5 * 60 * 1000,
  });

  const [scope, setScope] = useState<string>("__ALL__");

  const current = useMemo(() => {
    if (!data) return null;
    if (scope === "__ALL__") {
      return {
        label: "Les 4 QPV d'Orléans",
        responses: data.totalResponses,
        evolution: data.evolution,
        securite: aggregateSecurite(data.securite),
        delinquance: data.delinquance,
        implication: data.implication,
        pretAParticiper: data.pretAParticiper,
        discrimination: data.discrimination,
        anciennete: data.anciennete,
        situation: data.situation,
        ageGenre: data.ageGenre,
        difficultes: data.difficultes,
        frequentation: data.frequentation,
        jugements: data.jugements,
        priorites: data.priorites,
        verbatims: data.verbatims.map((v) => v.quote),
      };
    }
    const q = data.quartiers.find((x) => x.quartier === scope);
    if (!q) return null;
    return { label: q.quartier, ...q };
  }, [data, scope]);

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-citizen/10 via-card to-card p-8 shadow-sm">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-citizen/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-citizen/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-citizen">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-citizen" />
              Vague {data?.yearLabel ?? "2023"} · Google Sheets en direct
            </div>
            <h3 className="mt-3 text-3xl font-bold tracking-tight">Enquête habitants</h3>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Réponses récupérées en direct depuis le formulaire de participation citoyenne.
              Prochaines vagues : 2026 et 2029.
            </p>
            {data && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Dernière synchronisation : {new Date(data.fetchedAt).toLocaleString("fr-FR")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {data && (
              <div className="flex flex-col">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Périmètre
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="min-w-[240px] rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                >
                  <option value="__ALL__">Les 4 QPV d'Orléans ({data.totalResponses})</option>
                  {data.quartiers.map((q) => (
                    <option key={q.quartier} value={q.quartier}>
                      {q.quartier} ({q.responses})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm shadow-sm hover:bg-accent disabled:opacity-50"
            >
              {isFetching ? "Synchronisation…" : "↻ Rafraîchir"}
            </button>
          </div>
        </div>

        {current && (
          <div className="relative mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <BigStat label="Répondants" value={current.responses.toLocaleString("fr-FR")} hint={current.label} accent="citizen" />
            <BigStat
              label="Sentiment d'amélioration"
              value={`${pct(current.evolution.ameliore, current.evolution.total)}%`}
              accent="success"
            />
            <BigStat
              label="Se sentent en sécurité"
              value={`${pct(current.securite.oui, current.securite.total)}%`}
              accent="primary"
            />
            <BigStat
              label="Prêts à s'impliquer"
              value={`${pct(current.pretAParticiper.oui, current.pretAParticiper.total)}%`}
              accent="hot"
            />
          </div>
        )}
      </div>

      {isLoading && <Skeleton text="Récupération du Google Sheets…" />}
      {isError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de récupérer la feuille publique : {(error as Error).message}.
        </div>
      )}

      {data && current && (
        <>
          <Section title="Profil du panel" subtitle="Qui a répondu à l'enquête ?">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Panel title="Répartition par quartier" hint="Panel 2023">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={data.quartiers.map((q) => ({ q: q.quartier, c: q.responses }))}
                    layout="vertical" margin={{ left: 12, right: 12 }}
                  >
                    <defs>
                      <linearGradient id="gradCit" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="var(--citizen)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--citizen)" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="q" type="category" stroke="var(--muted-foreground)" width={150} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                    <Bar dataKey="c" radius={[0, 8, 8, 0]}>
                      {data.quartiers.map((q, i) => (
                        <Cell key={i} fill={scope !== "__ALL__" && q.quartier === scope ? "var(--primary)" : "url(#gradCit)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Ancienneté dans le quartier" hint="Depuis combien de temps">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={current.anciennete} dataKey="count" nameKey="label"
                      innerRadius={55} outerRadius={100} paddingAngle={3} stroke="var(--card)" strokeWidth={2}
                    >
                      {current.anciennete.map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Situation professionnelle" hint="Top 8 — MC1">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={current.situation} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="label" type="category" stroke="var(--muted-foreground)" width={170} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                    <Bar dataKey="count" fill="var(--axis-emploi)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>
          </Section>

          <Section title="Cadre de vie & sécurité" subtitle="Sentiment de sécurité, exposition à la délinquance">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Panel title="Sentiment de sécurité" hint="% d'habitants se sentant en sécurité, par quartier">
                <div className="flex flex-col gap-2.5 py-2">
                  {[...data.securite]
                    .map((s) => ({ q: s.quartier, val: pct(s.oui, s.total), n: s.total }))
                    .sort((a, b) => b.val - a.val)
                    .map((row) => {
                      const color = row.val >= 70 ? "var(--success)" : row.val >= 50 ? "var(--axis-emploi)" : row.val >= 35 ? "var(--hot)" : "var(--destructive)";
                      return (
                        <div key={row.q} className="group">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">{row.q}</span>
                            <span className="tabular-nums text-muted-foreground">
                              <span className="text-sm font-semibold text-foreground">{row.val}%</span>
                              <span className="ml-1.5 opacity-60">· {row.n} rép.</span>
                            </span>
                          </div>
                          <div className="relative h-3 overflow-hidden rounded-full bg-muted/60 ring-1 ring-border/40">
                            <div
                              className="h-full rounded-full shadow-sm transition-all duration-500"
                              style={{
                                width: `${row.val}%`,
                                background: `linear-gradient(90deg, color-mix(in oklab, ${color} 70%, transparent), ${color})`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "var(--success)" }} />≥ 70%</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "var(--axis-emploi)" }} />50–69%</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "var(--hot)" }} />35–49%</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "var(--destructive)" }} />&lt; 35%</span>
                  </div>
                </div>
              </Panel>

              <Panel title="Exposition à la délinquance (CV7)" hint="12 derniers mois">
                <ResponsiveContainer width="100%" height={280}>
                  <RadialBarChart
                    innerRadius="30%" outerRadius="100%"
                    data={[
                      { name: "Témoin", value: pct(current.delinquance.temoin, current.delinquance.total), fill: "var(--hot)" },
                      { name: "Victime", value: pct(current.delinquance.victime, current.delinquance.total), fill: "var(--destructive)" },
                      { name: "Aucun", value: pct(current.delinquance.aucun, current.delinquance.total), fill: "var(--success)" },
                    ]}
                    startAngle={90} endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background={{ fill: "var(--muted)" }} dataKey="value" cornerRadius={10} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Discrimination ressentie (VP4)" hint={`${current.discrimination.total} réponses`}>
                <div className="flex h-[280px] flex-col items-center justify-center gap-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Oui", value: current.discrimination.oui },
                          { name: "Non", value: current.discrimination.non },
                        ]}
                        dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={4}
                        stroke="var(--card)" strokeWidth={2}
                      >
                        <Cell fill="var(--destructive)" />
                        <Cell fill="var(--success)" />
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-destructive">
                        {pct(current.discrimination.oui, current.discrimination.total)}%
                      </div>
                      <div className="text-[10px] uppercase text-muted-foreground">Oui</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-success">
                        {pct(current.discrimination.non, current.discrimination.total)}%
                      </div>
                      <div className="text-[10px] uppercase text-muted-foreground">Non</div>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          </Section>

          <Section title="Évolution perçue du quartier" subtitle="Sur les 5 dernières années">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <Panel className="lg:col-span-2" title="Évolution globale (ID3)">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Amélioré", value: current.evolution.ameliore, fill: "var(--success)" },
                        { name: "Stable", value: current.evolution.stable, fill: "var(--muted-foreground)" },
                        { name: "Dégradé", value: current.evolution.degrade, fill: "var(--destructive)" },
                      ]}
                      dataKey="value" innerRadius={60} outerRadius={110} paddingAngle={4}
                      stroke="var(--card)" strokeWidth={2}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Panel>

              <Panel className="lg:col-span-3" title="Jugement par thématique (CV3)" hint="amélioré / stable / dégradé">
                <div className="space-y-2.5">
                  {current.jugements.map((j) => {
                    const a = pct(j.ameliore, j.total);
                    const s = pct(j.stable, j.total);
                    const d = pct(j.degrade, j.total);
                    return (
                      <div key={j.theme} className="grid grid-cols-12 items-center gap-3">
                        <div className="col-span-5 truncate text-xs" title={j.theme}>{j.theme}</div>
                        <div className="col-span-6 flex h-4 overflow-hidden rounded-full bg-muted shadow-inner">
                          <div className="bg-success transition-all" style={{ width: `${a}%` }} title={`${a}% améliorés`} />
                          <div className="bg-muted-foreground/40 transition-all" style={{ width: `${s}%` }} title={`${s}% stables`} />
                          <div className="bg-destructive transition-all" style={{ width: `${d}%` }} title={`${d}% dégradés`} />
                        </div>
                        <div className="col-span-1 text-right text-[10px] text-muted-foreground">n={j.total}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-success" /> Satisfait / amélioré</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-muted-foreground/40" /> Stable</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-destructive" /> Insatisfait / dégradé</span>
                </div>
              </Panel>
            </div>
          </Section>

          <Section title="Priorités & difficultés" subtitle="Ce qui doit changer dans les prochaines années">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel title="Top priorités citoyennes (CV10)" hint={current.label}>
                <ResponsiveContainer width="100%" height={Math.max(280, Math.min(current.priorites.length, 16) * 26)}>
                  <BarChart data={current.priorites.slice(0, 16)} layout="vertical" margin={{ left: 12, right: 24 }}>
                    <defs>
                      <linearGradient id="gradPrio" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="label" type="category" stroke="var(--muted-foreground)" width={250} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                    <Bar dataKey="count" fill="url(#gradPrio)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Difficultés du quotidien (VP2)" hint="Nombre de réponses 'Oui'">
                <ResponsiveContainer width="100%" height={Math.max(280, current.difficultes.length * 38)}>
                  <BarChart data={current.difficultes} layout="vertical" margin={{ left: 12, right: 24 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="label" type="category" stroke="var(--muted-foreground)" width={220} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                    <Bar dataKey="count" fill="var(--hot)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>
          </Section>

          <Section title="Vie locale & implication" subtitle="Fréquentation des lieux et engagement citoyen">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Panel className="lg:col-span-2" title="Fréquentation des lieux du quartier (CV2)" hint="Réponses 'Souvent / Très souvent'">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={current.frequentation} margin={{ bottom: 30 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} interval={0} />
                    <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {current.frequentation.map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Engagement citoyen">
                <div className="flex h-full flex-col justify-around gap-4 py-2">
                  <EngageBar label="Impliqué(e) dans la vie du quartier (DC1)" yes={current.implication.oui} total={current.implication.total} color="var(--axis-emancipation)" />
                  <EngageBar label="Prêt(e) à participer à des groupes (DC3)" yes={current.pretAParticiper.oui} total={current.pretAParticiper.total} color="var(--success)" />
                  <EngageBar label="Se sent en sécurité (CV4)" yes={current.securite.oui} total={current.securite.total} color="var(--primary)" />
                </div>
              </Panel>
            </div>
          </Section>

          <Section title="Paroles d'habitants" subtitle={`Verbatims — ${current.label}`}>
            {current.verbatims.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Aucun verbatim sur ce périmètre.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {current.verbatims.slice(0, 12).map((v, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
                    <div className="absolute -right-4 -top-4 font-serif text-7xl text-citizen/15">"</div>
                    <div className="relative">
                      <div className="mb-2 inline-flex rounded-full bg-citizen/15 px-2 py-0.5 text-[10px] font-semibold text-citizen">
                        {current.label}
                      </div>
                      <p className="text-sm italic leading-relaxed text-foreground">« {v} »</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
};

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <header>
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Panel({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        {hint && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function BigStat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent: "citizen" | "success" | "primary" | "hot" }) {
  const bgMap = { citizen: "from-citizen/20", success: "from-success/20", primary: "from-primary/20", hot: "from-hot/20" };
  const txtMap = { citizen: "text-citizen", success: "text-success", primary: "text-primary", hot: "text-hot" };
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br to-card p-4 shadow-sm", bgMap[accent])}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-3xl font-bold", txtMap[accent])}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function EngageBar({ label, yes, total, color }: { label: string; yes: number; total: number; color: string }) {
  const p = pct(yes, total);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{p}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: color }} />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">{yes} / {total} réponses</div>
    </div>
  );
}

function aggregateSecurite(rows: { quartier: string; oui: number; non: number; total: number }[]) {
  return rows.reduce(
    (acc, r) => ({ oui: acc.oui + r.oui, non: acc.non + r.non, total: acc.total + r.total }),
    { oui: 0, non: 0, total: 0 },
  );
}

function Skeleton({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-10 text-sm text-muted-foreground">
      <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-primary" />
      {text}
    </div>
  );
}

function pct(num: number, denom: number): number {
  if (!denom) return 0;
  return Math.round((num / denom) * 100);
}

// silence unused
void StatCard;

