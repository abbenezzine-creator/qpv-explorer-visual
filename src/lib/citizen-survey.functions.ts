import { createServerFn } from "@tanstack/react-start";

const SHEET_ID = "1qJv9PRV4BnkAFiL8KF4FxXmVhg-CocLI79HZH-iMe_w";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// Mapping libre des libellés Google Form -> QPV de la métropole d'Orléans
function mapToQuartier(raw: string): string {
  const v = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (v.includes("argonne")) return "L'Argonne";
  if (v.includes("source")) return "La Source";
  if (v.includes("dauphine") || v.includes("saint-marceau")) return "Dauphine";
  if (v.includes("blossier")) return "Les Blossières";
  if (v.includes("ormes du mail") || v.includes("andrillon")) return "Ormes du Mail";
  if (v.includes("clos de la grande")) return "Clos de la Grande Salle";
  if (v.includes("lignerolle")) return "Lignerolles";
  if (v.includes("3 fontaines") || v.includes("trois fontaines")) return "Les 3 Fontaines";
  if (v.includes("chaises")) return "Les Chaises";
  if (v.includes("pont-bordeau") || v.includes("pont bordeau")) return "Pont-Bordeau";
  if (!raw.trim()) return "Non renseigné";
  return raw.trim();
}

const ORLEANS_QPV = new Set(["L'Argonne", "La Source", "Dauphine", "Les Blossières"]);

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

export interface YesNo { oui: number; non: number; total: number }
export interface Distribution { label: string; count: number }

export interface QuartierAggregate {
  quartier: string;
  responses: number;
  evolution: { ameliore: number; stable: number; degrade: number; total: number };
  securite: YesNo;
  delinquance: { temoin: number; victime: number; aucun: number; total: number };
  implication: YesNo;
  pretAParticiper: YesNo;
  discrimination: YesNo;
  anciennete: Distribution[];
  ageGenre: Distribution[]; // MC4 (genre dans cette feuille)
  situation: Distribution[]; // MC1
  difficultes: Distribution[]; // VP2
  frequentation: Distribution[]; // CV2 — % "souvent/très souvent"
  jugements: { theme: string; ameliore: number; stable: number; degrade: number; total: number }[];
  priorites: Distribution[];
  verbatims: string[];
}

export interface CitizenSurveyData {
  fetchedAt: string;
  yearLabel: string;
  totalResponses: number;
  quartiers: QuartierAggregate[];
  byQuartier: Record<string, number>;
  // Globaux
  evolution: { ameliore: number; stable: number; degrade: number; total: number };
  jugements: { theme: string; ameliore: number; stable: number; degrade: number; total: number }[];
  securite: { quartier: string; oui: number; non: number; total: number }[];
  priorites: Distribution[];
  difficultes: Distribution[];
  frequentation: Distribution[];
  delinquance: { temoin: number; victime: number; aucun: number; total: number };
  implication: YesNo;
  pretAParticiper: YesNo;
  discrimination: YesNo;
  anciennete: Distribution[];
  situation: Distribution[];
  ageGenre: Distribution[];
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

function isSouvent(v: string): boolean {
  const s = v.toLowerCase();
  return s.includes("souvent");
}

function cleanAnciennete(v: string): string | null {
  const s = v.replace(/^[○●○•\s]+/, "").trim();
  if (!s) return null;
  return s;
}

function bumpDist(arr: Distribution[], label: string) {
  const found = arr.find((x) => x.label === label);
  if (found) found.count++;
  else arr.push({ label, count: 1 });
}

export const fetchCitizenSurvey = createServerFn({ method: "GET" }).handler(
  async (): Promise<CitizenSurveyData> => {
    const res = await fetch(CSV_URL, { redirect: "follow" });
    if (!res.ok) throw new Error(`Sheets fetch failed: ${res.status}`);
    const csv = await res.text();
    const rows = parseCsv(csv);
    const headers = rows[0] ?? [];
    const data = rows.slice(1).filter((r) => r.length > 1 && r.some((c) => c.trim()));

    const idx = (needle: string) => headers.findIndex((h) => h.toLowerCase().includes(needle.toLowerCase()));
    const iQuartier = idx("Dans quel quartier");
    const iAnciennete = idx("ID2 ");
    const iEvol = headers.findIndex((h) => h.startsWith("ID3"));
    const iSecu = headers.findIndex((h) => h.startsWith("CV4"));
    const iDelinquance = headers.findIndex((h) => h.startsWith("CV7"));
    const iImplication = headers.findIndex((h) => h.startsWith("DC1"));
    const iPret = headers.findIndex((h) => h.startsWith("DC3"));
    const iDiscrim = headers.findIndex((h) => h.startsWith("VP4"));
    const iSituation = headers.findIndex((h) => h.startsWith("MC1"));
    const iAgeGenre = headers.findIndex((h) => h.startsWith("MC4"));
    const iVerbatim = headers.findIndex((h) => h.startsWith("VP1"));

    const cv2Cols: { col: number; label: string }[] = [];
    headers.forEach((h, i) => {
      const m = h.match(/CV2.*\[(.+)\]/);
      if (m) cv2Cols.push({ col: i, label: m[1].trim().replace(/\s*\(.*$/, "") });
    });
    const cv3Cols: { col: number; label: string }[] = [];
    headers.forEach((h, i) => {
      const m = h.match(/CV3 -.*\[(.+)\]/);
      if (m && !h.includes("Bis") && !h.includes("ter")) cv3Cols.push({ col: i, label: m[1].trim() });
    });
    const cv10Cols: { col: number; label: string }[] = [];
    headers.forEach((h, i) => {
      const m = h.match(/CV10.*\[(.+)\]/);
      if (m) cv10Cols.push({ col: i, label: m[1].trim() });
    });
    const vp2Cols: { col: number; label: string }[] = [];
    headers.forEach((h, i) => {
      const m = h.match(/VP2.*\[(.+)\]/);
      if (m) vp2Cols.push({ col: i, label: m[1].trim() });
    });

    const perQuartier: Record<string, QuartierAggregate> = {};
    function ensure(q: string): QuartierAggregate {
      if (!perQuartier[q]) {
        perQuartier[q] = {
          quartier: q, responses: 0,
          evolution: { ameliore: 0, stable: 0, degrade: 0, total: 0 },
          securite: { oui: 0, non: 0, total: 0 },
          delinquance: { temoin: 0, victime: 0, aucun: 0, total: 0 },
          implication: { oui: 0, non: 0, total: 0 },
          pretAParticiper: { oui: 0, non: 0, total: 0 },
          discrimination: { oui: 0, non: 0, total: 0 },
          anciennete: [], ageGenre: [], situation: [], difficultes: [],
          frequentation: cv2Cols.map((c) => ({ label: c.label, count: 0 })),
          jugements: cv3Cols.map((c) => ({ theme: c.label, ameliore: 0, stable: 0, degrade: 0, total: 0 })),
          priorites: cv10Cols.map((c) => ({ label: c.label, count: 0 })),
          verbatims: [],
        };
      }
      return perQuartier[q];
    }

    const evolutionG = { ameliore: 0, stable: 0, degrade: 0, total: 0 };
    const jugementsG = cv3Cols.map((c) => ({ theme: c.label, ameliore: 0, stable: 0, degrade: 0, total: 0 }));
    const prioritesG = cv10Cols.map((c) => ({ label: c.label, count: 0 }));
    const frequentationG = cv2Cols.map((c) => ({ label: c.label, count: 0 }));
    const difficultesG: Distribution[] = vp2Cols.map((c) => ({ label: c.label, count: 0 }));
    const ancienneteG: Distribution[] = [];
    const situationG: Distribution[] = [];
    const ageGenreG: Distribution[] = [];
    const delinquanceG = { temoin: 0, victime: 0, aucun: 0, total: 0 };
    const implicationG: YesNo = { oui: 0, non: 0, total: 0 };
    const pretG: YesNo = { oui: 0, non: 0, total: 0 };
    const discriminationG: YesNo = { oui: 0, non: 0, total: 0 };
    const verbatimsG: { quartier: string; quote: string }[] = [];

    const yn = (v: string, target: YesNo, agg: YesNo) => {
      const s = v.toLowerCase().trim();
      if (!s) return;
      target.total++; agg.total++;
      if (s.startsWith("oui")) { target.oui++; agg.oui++; }
      else if (s.startsWith("non")) { target.non++; agg.non++; }
    };

    for (const r of data) {
      const q = mapToQuartier(r[iQuartier] ?? "");
      if (!ORLEANS_QPV.has(q)) continue;
      const agg = ensure(q);
      agg.responses++;

      const ev = classifyEvolution(r[iEvol] ?? "");
      if (ev) { agg.evolution[ev]++; agg.evolution.total++; evolutionG[ev]++; evolutionG.total++; }

      yn(r[iSecu] ?? "", agg.securite, { oui: 0, non: 0, total: 0 });
      // sécurité globale recalculée plus bas via per-quartier
      yn(r[iImplication] ?? "", agg.implication, implicationG);
      yn(r[iPret] ?? "", agg.pretAParticiper, pretG);
      const dv = (r[iDiscrim] ?? "").toLowerCase().trim();
      if (dv) {
        agg.discrimination.total++; discriminationG.total++;
        if (dv.startsWith("oui")) { agg.discrimination.oui++; discriminationG.oui++; }
        else if (dv.startsWith("non")) { agg.discrimination.non++; discriminationG.non++; }
      }

      const dl = (r[iDelinquance] ?? "").toLowerCase();
      if (dl.trim()) {
        agg.delinquance.total++; delinquanceG.total++;
        if (dl.includes("victime") && !dl.includes("ni")) { agg.delinquance.victime++; delinquanceG.victime++; }
        else if (dl.includes("témoin") && !dl.includes("ni")) { agg.delinquance.temoin++; delinquanceG.temoin++; }
        else { agg.delinquance.aucun++; delinquanceG.aucun++; }
      }

      const anc = cleanAnciennete(r[iAnciennete] ?? "");
      if (anc) { bumpDist(agg.anciennete, anc); bumpDist(ancienneteG, anc); }
      const sit = (r[iSituation] ?? "").trim();
      if (sit && sit.length < 50) { bumpDist(agg.situation, sit); bumpDist(situationG, sit); }
      const ag = (r[iAgeGenre] ?? "").trim();
      if (ag) { bumpDist(agg.ageGenre, ag); bumpDist(ageGenreG, ag); }

      cv2Cols.forEach((c, idx2) => {
        if (isSouvent(r[c.col] ?? "")) { agg.frequentation[idx2].count++; frequentationG[idx2].count++; }
      });
      cv3Cols.forEach((c, idx2) => {
        const cls = classifyJugement(r[c.col] ?? "");
        if (!cls) return;
        agg.jugements[idx2][cls]++; agg.jugements[idx2].total++;
        jugementsG[idx2][cls]++; jugementsG[idx2].total++;
      });
      cv10Cols.forEach((c, idx2) => {
        const v = (r[c.col] ?? "").trim().toLowerCase();
        if (v && !v.includes("non concerné")) {
          agg.priorites[idx2].count++; prioritesG[idx2].count++;
        }
      });
      vp2Cols.forEach((c, idx2) => {
        const v = (r[c.col] ?? "").toLowerCase().trim();
        if (v.startsWith("oui")) {
          // init in agg
          let local = agg.difficultes.find((d) => d.label === vp2Cols[idx2].label);
          if (!local) { local = { label: vp2Cols[idx2].label, count: 0 }; agg.difficultes.push(local); }
          local.count++;
          difficultesG[idx2].count++;
        }
      });

      const vb = (r[iVerbatim] ?? "").trim();
      if (vb && vb.length > 6) {
        if (agg.verbatims.length < 18) agg.verbatims.push(vb);
        if (verbatimsG.length < 60) verbatimsG.push({ quartier: q, quote: vb });
      }
    }

    const quartiers = Object.values(perQuartier)
      .map((q) => ({
        ...q,
        priorites: [...q.priorites].sort((a, b) => b.count - a.count),
        frequentation: [...q.frequentation].sort((a, b) => b.count - a.count),
        anciennete: [...q.anciennete].sort((a, b) => b.count - a.count),
        situation: [...q.situation].sort((a, b) => b.count - a.count).slice(0, 8),
        difficultes: [...q.difficultes].sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.responses - a.responses);
    const totalResponses = quartiers.reduce((sum, q) => sum + q.responses, 0);

    return {
      fetchedAt: new Date().toISOString(),
      yearLabel: "2023",
      totalResponses,
      quartiers,
      byQuartier: Object.fromEntries(quartiers.map((q) => [q.quartier, q.responses])),
      evolution: evolutionG,
      jugements: jugementsG,
      securite: quartiers.map((q) => ({ quartier: q.quartier, ...q.securite })),
      priorites: [...prioritesG].sort((a, b) => b.count - a.count),
      difficultes: [...difficultesG].sort((a, b) => b.count - a.count),
      frequentation: [...frequentationG].sort((a, b) => b.count - a.count),
      delinquance: delinquanceG,
      implication: implicationG,
      pretAParticiper: pretG,
      discrimination: discriminationG,
      anciennete: [...ancienneteG].sort((a, b) => b.count - a.count),
      situation: [...situationG].sort((a, b) => b.count - a.count).slice(0, 8),
      ageGenre: [...ageGenreG].sort((a, b) => b.count - a.count),
      verbatims: verbatimsG,
    };
  },
);
