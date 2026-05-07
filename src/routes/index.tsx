import { createFileRoute } from "@tanstack/react-router";
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

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Bandeau quartier + année + QPV picker */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
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
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
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
    <nav className="flex flex-wrap gap-2 border-b border-border pb-px">
      {items.map((it) => {
        const active = tab === it.key;
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={cn(
              "relative rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition",
              active
                ? "border-transparent bg-card text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            style={active && it.color ? { borderColor: it.color, color: it.color } : undefined}
          >
            {it.label}
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
function CitoyenPane() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["citizen-survey"],
    queryFn: () => fetchCitizenSurvey(),
    staleTime: 5 * 60 * 1000,
  });

  const [scope, setScope] = useState<string>("__ALL__");

  // Quand les données arrivent, on garde le scope choisi (ou __ALL__ par défaut)
  const current = useMemo(() => {
    if (!data) return null;
    if (scope === "__ALL__") {
      return {
        label: "Ensemble des QPV",
        responses: data.totalResponses,
        evolution: data.evolution,
        securite: aggregateSecurite(data.securite),
        jugements: data.jugements,
        priorites: data.priorites,
        verbatims: data.verbatims.map((v) => v.quote),
      };
    }
    const q = data.quartiers.find((x) => x.quartier === scope);
    if (!q) return null;
    return {
      label: q.quartier,
      responses: q.responses,
      evolution: q.evolution,
      securite: q.securite,
      jugements: q.jugements,
      priorites: q.priorites,
      verbatims: q.verbatims,
    };
  }, [data, scope]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-citizen/15 px-2 py-0.5 text-[10px] font-semibold text-citizen">
              Vague {data?.yearLabel ?? "2023"} · Google Sheets en direct
            </div>
            <h3 className="mt-2 text-xl font-semibold">Enquête habitants</h3>
            <p className="text-sm text-muted-foreground">
              Réponses récupérées en direct depuis le formulaire de participation citoyenne.
              Prochaines vagues : 2026 et 2029.
            </p>
            {data && (
              <p className="mt-1 text-[11px] text-muted-foreground">
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
                  className="min-w-[220px] rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="__ALL__">Tous les quartiers</option>
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
              className="rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              {isFetching ? "…" : "↻"} Rafraîchir
            </button>
          </div>
        </div>

        {current && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Répondants" value={current.responses.toString()} />
            <Stat label="Périmètre" value={current.label} />
            <Stat
              label="Sentiment d'amélioration"
              value={`${pct(current.evolution.ameliore, current.evolution.total)}%`}
              positive
            />
            <Stat
              label="Sentiment de dégradation"
              value={`${pct(current.evolution.degrade, current.evolution.total)}%`}
              negative
            />
          </div>
        )}
      </div>

      {isLoading && <Skeleton text="Récupération du Google Sheets…" />}
      {isError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de récupérer la feuille publique : {(error as Error).message}.
          Vérifiez que le partage du Google Sheets est en lecture publique.
        </div>
      )}

      {data && current && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h4 className="mb-1 font-semibold">Répartition des répondants</h4>
              <p className="mb-4 text-xs text-muted-foreground">par quartier (ensemble du panel 2023)</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.quartiers.map((q) => ({ q: q.quartier, c: q.responses }))}
                  layout="vertical"
                  margin={{ left: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" />
                  <YAxis dataKey="q" type="category" stroke="var(--muted-foreground)" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="c" radius={[0, 6, 6, 0]}>
                    {data.quartiers.map((q, i) => (
                      <Cell
                        key={i}
                        fill={scope !== "__ALL__" && q.quartier === scope ? "var(--primary)" : "var(--citizen)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h4 className="mb-1 font-semibold">Sentiment de sécurité</h4>
              <p className="mb-4 text-xs text-muted-foreground">par quartier · % "oui je me sens en sécurité"</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.securite.map((s) => ({
                    q: s.quartier,
                    Oui: pct(s.oui, s.total),
                    Non: pct(s.non, s.total),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="q" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="var(--muted-foreground)" unit="%" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="Oui" stackId="a" fill="var(--success)" />
                  <Bar dataKey="Non" stackId="a" fill="var(--destructive)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <header className="mb-4 flex items-baseline justify-between">
              <h4 className="font-semibold">Top priorités citoyennes (CV10)</h4>
              <span className="text-xs text-muted-foreground">{current.label}</span>
            </header>
            <ResponsiveContainer width="100%" height={Math.max(260, Math.min(current.priorites.length, 16) * 28)}>
              <BarChart data={current.priorites.slice(0, 16)} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" />
                <YAxis dataKey="theme" type="category" stroke="var(--muted-foreground)" width={260} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <header className="mb-4 flex items-baseline justify-between">
              <h4 className="font-semibold">Jugement sur les 5 dernières années (CV3)</h4>
              <span className="text-xs text-muted-foreground">{current.label}</span>
            </header>
            <div className="space-y-2">
              {current.jugements.map((j) => (
                <div key={j.theme} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-5 text-xs">{j.theme}</div>
                  <div className="col-span-6 flex h-3 overflow-hidden rounded-full bg-muted" title={`+${j.ameliore} / =${j.stable} / -${j.degrade}`}>
                    <div className="bg-success" style={{ width: `${pct(j.ameliore, j.total)}%` }} />
                    <div className="bg-muted-foreground/40" style={{ width: `${pct(j.stable, j.total)}%` }} />
                    <div className="bg-destructive" style={{ width: `${pct(j.degrade, j.total)}%` }} />
                  </div>
                  <div className="col-span-1 text-right text-[10px] text-muted-foreground">n={j.total}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-success" /> Satisfait / amélioré</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-muted-foreground/40" /> Stable</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-destructive" /> Insatisfait / dégradé</span>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Verbatims — paroles d'habitants ({current.label})
            </h4>
            {current.verbatims.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Aucun verbatim sur ce périmètre.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {current.verbatims.slice(0, 12).map((v, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="mb-2 inline-flex rounded-full bg-citizen/15 px-2 py-0.5 text-[10px] font-semibold text-citizen">
                      {current.label}
                    </div>
                    <p className="text-sm italic text-foreground">« {v} »</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function aggregateSecurite(rows: { quartier: string; oui: number; non: number; total: number }[]) {
  return rows.reduce(
    (acc, r) => ({ oui: acc.oui + r.oui, non: acc.non + r.non, total: acc.total + r.total }),
    { oui: 0, non: 0, total: 0 },
  );
}

function Stat({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-xl font-bold",
        positive && "text-success", negative && "text-destructive")}>{value}</div>
    </div>
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
