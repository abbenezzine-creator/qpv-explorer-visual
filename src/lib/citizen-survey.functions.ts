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
  return raw.trim() || "Autre";
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

export interface CitizenSurveyData {
  fetchedAt: string;
  totalResponses: number;
  byQuartier: Record<string, number>;
  // CV3 — jugements par thème
  jugements: { theme: string; ameliore: number; stable: number; degrade: number; total: number }[];
  // CV4 — sentiment de sécurité par quartier
  securite: { quartier: string; oui: number; non: number; total: number }[];
  // CV10 — top priorités
  priorites: { theme: string; count: number }[];
  // ID3 — évolution ressentie globale
  evolution: { ameliore: number; stable: number; degrade: number; total: number };
  // Verbatims
  verbatims: { quartier: string; quote: string }[];
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

    const byQuartier: Record<string, number> = {};
    const evolution = { ameliore: 0, stable: 0, degrade: 0, total: 0 };
    const securiteMap: Record<string, { oui: number; non: number; total: number }> = {};
    const verbatims: { quartier: string; quote: string }[] = [];

    // Thèmes CV3 (jugements 5 dernières années)
    const cv3Themes: { col: number; label: string }[] = [];
    headers.forEach((h, i) => {
      const m = h.match(/CV3.*\[(.+)\]/);
      if (m && !h.includes("Bis") && !h.includes("ter")) {
        cv3Themes.push({ col: i, label: m[1].trim() });
      }
    });
    const jugementsAcc = cv3Themes.map((t) => ({
      theme: t.label, col: t.col, ameliore: 0, stable: 0, degrade: 0, total: 0,
    }));

    // Priorités CV10
    const cv10Themes: { col: number; label: string }[] = [];
    headers.forEach((h, i) => {
      const m = h.match(/CV10.*\[(.+)\]/);
      if (m) cv10Themes.push({ col: i, label: m[1].trim() });
    });
    const prioritesAcc = cv10Themes.map((t) => ({ theme: t.label, col: t.col, count: 0 }));

    for (const r of data) {
      const q = mapToQuartier(r[iQuartier] ?? "");
      byQuartier[q] = (byQuartier[q] ?? 0) + 1;

      // Evolution ID3
      const ev = (r[iEvol] ?? "").toLowerCase();
      if (ev) {
        evolution.total++;
        if (ev.includes("amélior") || ev.includes("ameliore")) evolution.ameliore++;
        else if (ev.includes("dégrad") || ev.includes("degrad")) evolution.degrade++;
        else evolution.stable++;
      }

      // Sécurité CV4
      const sec = (r[iSecu] ?? "").toLowerCase().trim();
      if (sec) {
        if (!securiteMap[q]) securiteMap[q] = { oui: 0, non: 0, total: 0 };
        securiteMap[q].total++;
        if (sec.startsWith("oui")) securiteMap[q].oui++;
        else if (sec.startsWith("non")) securiteMap[q].non++;
      }

      // Jugements CV3
      for (const j of jugementsAcc) {
        const v = (r[j.col] ?? "").toLowerCase();
        if (!v.trim()) continue;
        j.total++;
        if (v.includes("très satisf") || v.includes("amélior")) j.ameliore++;
        else if (v.includes("insatisf") || v.includes("dégrad")) j.degrade++;
        else j.stable++;
      }

      // Priorités CV10 (case cochée = libellé non vide et != "")
      for (const p of prioritesAcc) {
        const v = (r[p.col] ?? "").trim();
        if (v && v.toLowerCase() !== "non concerné(e)") p.count++;
      }

      // Verbatim
      const vb = (r[iVerbatim] ?? "").trim();
      if (vb && vb.length > 8 && verbatims.length < 30) verbatims.push({ quartier: q, quote: vb });
    }

    return {
      fetchedAt: new Date().toISOString(),
      totalResponses: data.length,
      byQuartier,
      jugements: jugementsAcc.map(({ col: _c, ...rest }) => rest),
      securite: Object.entries(securiteMap).map(([quartier, v]) => ({ quartier, ...v })),
      priorites: prioritesAcc
        .map(({ col: _c, ...rest }) => rest)
        .sort((a, b) => b.count - a.count),
      evolution,
      verbatims,
    };
  },
);
