import { createServerFn } from "@tanstack/react-start";

const SHEET_ID = "1qJv9PRV4BnkAFiL8KF4FxXmVhg-CocLI79HZH-iMe_w";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// Mapping libre des libellés Google Form -> QPV de la métropole
function mapToQuartier(raw: string): string {
  const v = raw.toLowerCase();
  if (v.includes("argonne")) return "L'Argonne";
  if (v.includes("source")) return "La Source";
  if (v.includes("dauphine")) return "Dauphine";
  if (v.includes("blossier")) return "Les Blossières";
  if (v.includes("bordeau") || v.includes("saint-jean")) return "Pont-Bordeau";
  if (v.includes("orme") || v.includes("fleury")) return "Orme-Mortier";
  if (!raw.trim()) return "Non renseigné";
  return raw.trim();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") {/* skip */}
      else cur += c;
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export interface QuartierAggregate {
  quartier: string;
  responses: number;
  evolution: { ameliore: number; stable: number; degrade: number; total: number };
  securite: { oui: number; non: number; total: number };
  jugements: { theme: string; ameliore: number; stable: number; degrade: number; total: number }[];
  priorites: { theme: string; count: number }[];
  verbatims: string[];
}

export interface CitizenSurveyData {
  fetchedAt: string;
  yearLabel: string;
  totalResponses: number;
  quartiers: QuartierAggregate[]; // détail par quartier
  // Agrégats globaux (utiles pour la vue d'ensemble)
  byQuartier: Record<string, number>;
  evolution: { ameliore: number; stable: number; degrade: number; total: number };
  jugements: { theme: string; ameliore: number; stable: number; degrade: number; total: number }[];
  securite: { quartier: string; oui: number; non: number; total: number }[];
  priorites: { theme: string; count: number }[];
  verbatims: { quartier: string; quote: string }[];
}

function classifyEvolution(v: string): "ameliore" | "stable" | "degrade" | null {
  const s = v.toLowerCase();
  if (!s.trim()) return null;
  if (s.includes("amélior") || s.includes("ameliore")) return "ameliore";
  if (s.includes("dégrad") || s.includes("degrad")) return "degrade";
  return "stable";
}

function classifyJugement(v: string): "ameliore" | "stable" | "degrade" | null {
  const s = v.toLowerCase().trim();
  if (!s) return null;
  if (s.includes("très satisf") || s.includes("amélior")) return "ameliore";
  if (s.includes("insatisf") || s.includes("dégrad") || s.includes("pas satisf")) return "degrade";
  return "stable";
}

export const fetchCitizenSurvey = createServerFn({ method: "GET" }).handler(
  async (): Promise<CitizenSurveyData> => {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`Sheets fetch failed: ${res.status}`);
    const csv = await res.text();
    const rows = parseCsv(csv);
    const headers = rows[0] ?? [];
    const data = rows.slice(1).filter((r) => r.length > 1 && r.some((c) => c.trim()));

    const idx = (needle: string) => headers.findIndex((h) => h.toLowerCase().includes(needle.toLowerCase()));
    const iQuartier = idx("Dans quel quartier");
    const iEvol = idx("ID3");
    const iSecu = idx("CV4");
    const iVerbatim = idx("VP1");

    // Colonnes thématiques CV3 (jugements 5 dernières années)
    const cv3Cols: { col: number; label: string }[] = [];
    headers.forEach((h, i) => {
      const m = h.match(/CV3.*\[(.+)\]/);
      if (m && !h.includes("Bis") && !h.includes("ter")) {
        cv3Cols.push({ col: i, label: m[1].trim() });
      }
    });

    // Colonnes priorités CV10
    const cv10Cols: { col: number; label: string }[] = [];
    headers.forEach((h, i) => {
      const m = h.match(/CV10.*\[(.+)\]/);
      if (m) cv10Cols.push({ col: i, label: m[1].trim() });
    });

    // Init agrégats par quartier
    const perQuartier: Record<string, QuartierAggregate> = {};
    function ensure(q: string): QuartierAggregate {
      if (!perQuartier[q]) {
        perQuartier[q] = {
          quartier: q,
          responses: 0,
          evolution: { ameliore: 0, stable: 0, degrade: 0, total: 0 },
          securite: { oui: 0, non: 0, total: 0 },
          jugements: cv3Cols.map((c) => ({ theme: c.label, ameliore: 0, stable: 0, degrade: 0, total: 0 })),
          priorites: cv10Cols.map((c) => ({ theme: c.label, count: 0 })),
          verbatims: [],
        };
      }
      return perQuartier[q];
    }

    // Globaux
    const evolutionG = { ameliore: 0, stable: 0, degrade: 0, total: 0 };
    const jugementsG = cv3Cols.map((c) => ({ theme: c.label, ameliore: 0, stable: 0, degrade: 0, total: 0 }));
    const prioritesG = cv10Cols.map((c) => ({ theme: c.label, count: 0 }));
    const verbatimsG: { quartier: string; quote: string }[] = [];

    for (const r of data) {
      const q = mapToQuartier(r[iQuartier] ?? "");
      const agg = ensure(q);
      agg.responses++;

      // ID3 — évolution ressentie
      const ev = classifyEvolution(r[iEvol] ?? "");
      if (ev) {
        agg.evolution[ev]++; agg.evolution.total++;
        evolutionG[ev]++; evolutionG.total++;
      }

      // CV4 — sécurité
      const sec = (r[iSecu] ?? "").toLowerCase().trim();
      if (sec) {
        agg.securite.total++;
        if (sec.startsWith("oui")) agg.securite.oui++;
        else if (sec.startsWith("non")) agg.securite.non++;
      }

      // CV3 — jugements
      cv3Cols.forEach((c, idx2) => {
        const cls = classifyJugement(r[c.col] ?? "");
        if (!cls) return;
        agg.jugements[idx2][cls]++; agg.jugements[idx2].total++;
        jugementsG[idx2][cls]++; jugementsG[idx2].total++;
      });

      // CV10 — priorités cochées
      cv10Cols.forEach((c, idx2) => {
        const v = (r[c.col] ?? "").trim();
        if (v && v.toLowerCase() !== "non concerné(e)" && v.toLowerCase() !== "non concerne(e)") {
          agg.priorites[idx2].count++;
          prioritesG[idx2].count++;
        }
      });

      // Verbatim VP1
      const vb = (r[iVerbatim] ?? "").trim();
      if (vb && vb.length > 6) {
        if (agg.verbatims.length < 12) agg.verbatims.push(vb);
        if (verbatimsG.length < 40) verbatimsG.push({ quartier: q, quote: vb });
      }
    }

    // Tri priorités par quartier (desc)
    const quartiers = Object.values(perQuartier)
      .map((q) => ({ ...q, priorites: [...q.priorites].sort((a, b) => b.count - a.count) }))
      .sort((a, b) => b.responses - a.responses);

    return {
      fetchedAt: new Date().toISOString(),
      yearLabel: "2023",
      totalResponses: data.length,
      quartiers,
      byQuartier: Object.fromEntries(quartiers.map((q) => [q.quartier, q.responses])),
      evolution: evolutionG,
      jugements: jugementsG,
      securite: quartiers.map((q) => ({ quartier: q.quartier, ...q.securite })),
      priorites: [...prioritesG].sort((a, b) => b.count - a.count),
      verbatims: verbatimsG,
    };
  },
);
