// Modèle de données du Diagnostic territorial QPV Orléans Métropole
// Couvre la période 2014 → 2030 (Contrat de ville "Engagements Quartiers 2030")
// 5 axes : Emancipation, Santé-Vieillissement, Emploi, Transition, Tranquillité

export type QPVKey = "argonne" | "lasource" | "dauphine" | "blossieres";

export interface QPV {
  key: QPVKey;
  name: string;
  short: string;
  commune: string;
  description: string;
}

export const QPVS: QPV[] = [
  { key: "argonne", name: "L'Argonne", short: "ARG", commune: "Orléans",
    description: "Quartier nord-est d'Orléans, en pleine rénovation urbaine NPNRU." },
  { key: "lasource", name: "La Source", short: "SRC", commune: "Orléans",
    description: "Plus grand QPV d'Orléans, au sud, université et CHRO." },
  { key: "dauphine", name: "Dauphine", short: "DPH", commune: "Orléans",
    description: "Quartier sud, secteur résidentiel en transformation." },
  { key: "blossieres", name: "Les Blossières", short: "BLO", commune: "Orléans",
    description: "Quartier nord-ouest, mixité d'habitat collectif et pavillonnaire." },
];

export type AxisKey = "emancipation" | "sante" | "emploi" | "transition" | "tranquillite";

export interface Axis {
  key: AxisKey;
  label: string;
  short: string;
  description: string;
  colorVar: string; // tailwind / css var
}

export const AXES: Axis[] = [
  { key: "emancipation", label: "Émancipation", short: "EMA",
    description: "Éducation, parentalité, culture, sport, mixité, engagement.",
    colorVar: "var(--axis-emancipation)" },
  { key: "sante", label: "Santé · Vieillissement", short: "SAN",
    description: "Prévention, accès aux soins, vieillissement, handicap.",
    colorVar: "var(--axis-sante)" },
  { key: "emploi", label: "Emploi · Insertion", short: "EMP",
    description: "Insertion professionnelle, création d'activité, formation.",
    colorVar: "var(--axis-emploi)" },
  { key: "transition", label: "Transition écologique", short: "TRA",
    description: "Énergie, mobilité, biodiversité, alimentation durable.",
    colorVar: "var(--axis-transition)" },
  { key: "tranquillite", label: "Tranquillité publique", short: "TRQ",
    description: "Sécurité, prévention de la délinquance, médiation.",
    colorVar: "var(--axis-tranquillite)" },
];

// Sources / collecteurs (référentiel d'évaluation)
export type SourceKey =
  | "INSEE" | "CAF" | "ARS" | "PREF" | "METROPOLE" | "BAILLEURS"
  | "CRIJ" | "EDUC_NAT" | "DEPARTEMENT" | "CITOYEN";

export const SOURCES: Record<SourceKey, { label: string; type: "froide" | "chaude" | "citoyenne" | "partenaire" }> = {
  INSEE:       { label: "INSEE / Filosofi",          type: "froide" },
  CAF:         { label: "CAF du Loiret",             type: "froide" },
  ARS:         { label: "ARS Centre-Val de Loire",   type: "partenaire" },
  PREF:        { label: "Préfecture du Loiret",      type: "partenaire" },
  METROPOLE:   { label: "Orléans Métropole",         type: "partenaire" },
  BAILLEURS:   { label: "Bailleurs sociaux",         type: "partenaire" },
  CRIJ:        { label: "CRIJ",                      type: "partenaire" },
  EDUC_NAT:    { label: "Éducation nationale",       type: "froide" },
  DEPARTEMENT: { label: "Conseil départemental 45",  type: "partenaire" },
  CITOYEN:     { label: "Enquête habitants",         type: "citoyenne" },
};

export interface Indicator {
  id: string;
  axis: AxisKey;
  label: string;
  unit: string;            // %, €, nb, /100, ...
  source: SourceKey;
  positiveIsGood: boolean; // hausse = bonne nouvelle ?
  category: "froide" | "chaude" | "citoyenne" | "partenaire";
  hint?: string;
  // série annuelle 2014..2030 par QPV (valeurs réelles + projections)
  series: Record<QPVKey, Record<number, number | null>>;
}

// Helper de génération de séries trend + bruit
function trend(start: number, end: number, qpv: QPVKey, jitter = 0): Record<number, number | null> {
  const out: Record<number, number | null> = {};
  const years = Array.from({ length: 17 }, (_, i) => 2014 + i);
  // décale légèrement par QPV pour différencier
  const offset = { argonne: 0, lasource: 0.05, dauphine: -0.05, blossieres: 0.02 }[qpv];
  for (let i = 0; i < years.length; i++) {
    const t = i / (years.length - 1);
    const base = start + (end - start) * t;
    const seedNoise = Math.sin((i + 1) * (qpv.length + 3)) * jitter;
    out[years[i]] = Math.round((base * (1 + offset) + seedNoise) * 100) / 100;
  }
  return out;
}

// Helper sparse — uniquement certaines années
function sparse(values: Record<number, number>): Record<number, number | null> {
  const out: Record<number, number | null> = {};
  for (let y = 2014; y <= 2030; y++) out[y] = values[y] ?? null;
  return out;
}

export const INDICATORS: Indicator[] = [
  // ========== ÉMANCIPATION ==========
  { id: "pop", axis: "emancipation", label: "Population", unit: "hab.",
    source: "INSEE", positiveIsGood: true, category: "froide",
    hint: "Recensement INSEE — population municipale",
    series: {
      argonne:    trend(8480, 7100, "argonne", 30),
      lasource:   trend(10210, 11900, "lasource", 40),
      dauphine:   trend(3120, 2900, "dauphine", 15),
      blossieres: trend(4760, 4400, "blossieres", 20),
    }},
  { id: "u25", axis: "emancipation", label: "Part des moins de 25 ans", unit: "%",
    source: "INSEE", positiveIsGood: true, category: "froide",
    series: {
      argonne:    trend(43, 38, "argonne", 0.4),
      lasource:   trend(40, 36, "lasource", 0.4),
      dauphine:   trend(36, 32, "dauphine", 0.3),
      blossieres: trend(38, 34, "blossieres", 0.3),
    }},
  { id: "decrochage", axis: "emancipation", label: "Décrochage scolaire (collèges/lycées suivis)", unit: "%",
    source: "EDUC_NAT", positiveIsGood: false, category: "froide",
    hint: "% d'élèves en situation de décrochage — référentiel CV",
    series: {
      argonne:    trend(11.2, 7.5, "argonne", 0.3),
      lasource:   trend(9.8, 6.8, "lasource", 0.3),
      dauphine:   trend(7.4, 5.5, "dauphine", 0.2),
      blossieres: trend(8.6, 6.2, "blossieres", 0.2),
    }},
  { id: "clas", axis: "emancipation", label: "Jeunes accueillis en CLAS", unit: "jeunes",
    source: "CAF", positiveIsGood: true, category: "froide",
    hint: "Contrat Local d'Accompagnement à la Scolarité — CAF",
    series: {
      argonne:    trend(120, 240, "argonne", 5),
      lasource:   trend(180, 320, "lasource", 6),
      dauphine:   trend(60, 110, "dauphine", 3),
      blossieres: trend(85, 160, "blossieres", 4),
    }},
  { id: "reaap", axis: "emancipation", label: "Actions REAAP financées", unit: "actions",
    source: "CAF", positiveIsGood: true, category: "partenaire",
    hint: "Réseau d'Écoute, d'Appui et d'Accompagnement des Parents",
    series: {
      argonne:    trend(6, 14, "argonne", 0.5),
      lasource:   trend(8, 18, "lasource", 0.5),
      dauphine:   trend(3, 8, "dauphine", 0.3),
      blossieres: trend(4, 10, "blossieres", 0.3),
    }},
  { id: "stages3", axis: "emancipation", label: "Élèves ayant réalisé un stage de 3ème", unit: "%",
    source: "EDUC_NAT", positiveIsGood: true, category: "froide",
    series: {
      argonne:    trend(78, 96, "argonne", 0.5),
      lasource:   trend(82, 97, "lasource", 0.5),
      dauphine:   trend(85, 98, "dauphine", 0.4),
      blossieres: trend(80, 96, "blossieres", 0.4),
    }},
  { id: "passport", axis: "emancipation", label: "Bénéficiaires Pass'Sport", unit: "bénéf.",
    source: "METROPOLE", positiveIsGood: true, category: "partenaire",
    series: {
      argonne:    trend(0, 380, "argonne", 8),
      lasource:   trend(0, 520, "lasource", 10),
      dauphine:   trend(0, 180, "dauphine", 5),
      blossieres: trend(0, 240, "blossieres", 6),
    }},

  // ========== SANTÉ · VIEILLISSEMENT ==========
  { id: "fir", axis: "sante", label: "Actions soutenues par le FIR (ARS)", unit: "actions",
    source: "ARS", positiveIsGood: true, category: "partenaire",
    hint: "Fonds d'Intervention Régional — Agence Régionale de Santé",
    series: {
      argonne:    trend(4, 12, "argonne", 0.4),
      lasource:   trend(6, 16, "lasource", 0.5),
      dauphine:   trend(2, 7, "dauphine", 0.3),
      blossieres: trend(3, 9, "blossieres", 0.3),
    }},
  { id: "medecins", axis: "sante", label: "Densité de médecins généralistes", unit: "/10 000 hab.",
    source: "ARS", positiveIsGood: true, category: "froide",
    series: {
      argonne:    trend(6.2, 7.8, "argonne", 0.1),
      lasource:   trend(7.5, 9.0, "lasource", 0.1),
      dauphine:   trend(8.0, 9.5, "dauphine", 0.1),
      blossieres: trend(6.8, 8.2, "blossieres", 0.1),
    }},
  { id: "cmu", axis: "sante", label: "Bénéficiaires CSS / C2S", unit: "%",
    source: "CAF", positiveIsGood: false, category: "froide",
    hint: "Complémentaire Santé Solidaire — indicateur de précarité sanitaire",
    series: {
      argonne:    trend(28, 22, "argonne", 0.4),
      lasource:   trend(25, 20, "lasource", 0.4),
      dauphine:   trend(20, 16, "dauphine", 0.3),
      blossieres: trend(23, 18, "blossieres", 0.3),
    }},
  { id: "vieux", axis: "sante", label: "Part des 65 ans et plus", unit: "%",
    source: "INSEE", positiveIsGood: true, category: "froide",
    series: {
      argonne:    trend(14, 19, "argonne", 0.2),
      lasource:   trend(13, 18, "lasource", 0.2),
      dauphine:   trend(17, 22, "dauphine", 0.2),
      blossieres: trend(15, 20, "blossieres", 0.2),
    }},

  // ========== EMPLOI · INSERTION ==========
  { id: "chomage", axis: "emploi", label: "Taux de chômage (15-64 ans)", unit: "%",
    source: "INSEE", positiveIsGood: false, category: "froide",
    hint: "Taux de chômage au sens du recensement",
    series: {
      argonne:    trend(26.4, 18.2, "argonne", 0.5),
      lasource:   trend(24.1, 17.0, "lasource", 0.4),
      dauphine:   trend(19.5, 13.5, "dauphine", 0.3),
      blossieres: trend(21.8, 15.4, "blossieres", 0.4),
    }},
  { id: "chomage_jeunes", axis: "emploi", label: "Chômage des moins de 25 ans", unit: "%",
    source: "INSEE", positiveIsGood: false, category: "froide",
    series: {
      argonne:    trend(38, 26, "argonne", 0.6),
      lasource:   trend(34, 24, "lasource", 0.5),
      dauphine:   trend(28, 19, "dauphine", 0.5),
      blossieres: trend(32, 22, "blossieres", 0.5),
    }},
  { id: "neet", axis: "emploi", label: "16-25 ans non scolarisés et sans emploi (NEET)", unit: "%",
    source: "INSEE", positiveIsGood: false, category: "froide",
    series: {
      argonne:    trend(22, 14, "argonne", 0.4),
      lasource:   trend(19, 12, "lasource", 0.4),
      dauphine:   trend(14, 9, "dauphine", 0.3),
      blossieres: trend(17, 11, "blossieres", 0.3),
    }},
  { id: "revenu", axis: "emploi", label: "Revenu médian disponible", unit: "€",
    source: "INSEE", positiveIsGood: true, category: "froide",
    hint: "Source INSEE / Filosofi",
    series: {
      argonne:    trend(12800, 16200, "argonne", 50),
      lasource:   trend(13100, 16800, "lasource", 60),
      dauphine:   trend(13900, 17600, "dauphine", 50),
      blossieres: trend(13400, 17000, "blossieres", 50),
    }},
  { id: "pauvrete", axis: "emploi", label: "Taux de pauvreté", unit: "%",
    source: "INSEE", positiveIsGood: false, category: "froide",
    series: {
      argonne:    trend(42, 30, "argonne", 0.5),
      lasource:   trend(38, 28, "lasource", 0.4),
      dauphine:   trend(32, 23, "dauphine", 0.3),
      blossieres: trend(35, 25, "blossieres", 0.4),
    }},
  { id: "rsa", axis: "emploi", label: "Allocataires RSA", unit: "/1000 hab.",
    source: "CAF", positiveIsGood: false, category: "froide",
    series: {
      argonne:    trend(118, 78, "argonne", 1.5),
      lasource:   trend(102, 70, "lasource", 1.4),
      dauphine:   trend(78, 55, "dauphine", 1.0),
      blossieres: trend(92, 65, "blossieres", 1.2),
    }},
  { id: "creation", axis: "emploi", label: "Créations d'entreprises QPV", unit: "/an",
    source: "METROPOLE", positiveIsGood: true, category: "partenaire",
    series: {
      argonne:    trend(38, 95, "argonne", 2),
      lasource:   trend(54, 130, "lasource", 3),
      dauphine:   trend(22, 60, "dauphine", 1.5),
      blossieres: trend(30, 78, "blossieres", 2),
    }},

  // ========== TRANSITION ÉCOLOGIQUE ==========
  { id: "passoires", axis: "transition", label: "Logements passoires énergétiques (F-G)", unit: "%",
    source: "BAILLEURS", positiveIsGood: false, category: "partenaire",
    hint: "Étiquettes DPE F et G du parc social",
    series: {
      argonne:    trend(28, 6, "argonne", 0.5),
      lasource:   trend(22, 5, "lasource", 0.4),
      dauphine:   trend(18, 4, "dauphine", 0.3),
      blossieres: trend(24, 5, "blossieres", 0.4),
    }},
  { id: "renovees", axis: "transition", label: "Logements rénovés (NPNRU + bailleurs)", unit: "logts cumulés",
    source: "METROPOLE", positiveIsGood: true, category: "partenaire",
    series: {
      argonne:    trend(0, 1850, "argonne", 20),
      lasource:   trend(0, 2400, "lasource", 25),
      dauphine:   trend(0, 720, "dauphine", 15),
      blossieres: trend(0, 980, "blossieres", 18),
    }},
  { id: "vegetal", axis: "transition", label: "Couverture végétale", unit: "%",
    source: "METROPOLE", positiveIsGood: true, category: "partenaire",
    series: {
      argonne:    trend(22, 32, "argonne", 0.3),
      lasource:   trend(28, 38, "lasource", 0.3),
      dauphine:   trend(20, 28, "dauphine", 0.3),
      blossieres: trend(24, 33, "blossieres", 0.3),
    }},
  { id: "tram", axis: "transition", label: "Voyageurs/jour transport en commun", unit: "voy./j",
    source: "METROPOLE", positiveIsGood: true, category: "partenaire",
    series: {
      argonne:    trend(4200, 7800, "argonne", 80),
      lasource:   trend(8800, 14500, "lasource", 120),
      dauphine:   trend(2400, 4400, "dauphine", 50),
      blossieres: trend(3100, 5600, "blossieres", 60),
    }},

  // ========== TRANQUILLITÉ PUBLIQUE ==========
  { id: "delits", axis: "tranquillite", label: "Atteintes aux personnes", unit: "/1000 hab.",
    source: "PREF", positiveIsGood: false, category: "partenaire",
    hint: "État 4001 — Préfecture / DDSP",
    series: {
      argonne:    trend(14.2, 9.8, "argonne", 0.3),
      lasource:   trend(12.1, 8.4, "lasource", 0.3),
      dauphine:   trend(8.6, 6.0, "dauphine", 0.2),
      blossieres: trend(10.4, 7.2, "blossieres", 0.2),
    }},
  { id: "cambrio", axis: "tranquillite", label: "Cambriolages", unit: "/1000 logts",
    source: "PREF", positiveIsGood: false, category: "partenaire",
    series: {
      argonne:    trend(11, 5.5, "argonne", 0.3),
      lasource:   trend(9, 4.6, "lasource", 0.2),
      dauphine:   trend(7, 3.8, "dauphine", 0.2),
      blossieres: trend(8, 4.2, "blossieres", 0.2),
    }},
  { id: "mediation", axis: "tranquillite", label: "Interventions de médiation sociale", unit: "interv./an",
    source: "METROPOLE", positiveIsGood: true, category: "partenaire",
    series: {
      argonne:    trend(220, 580, "argonne", 8),
      lasource:   trend(310, 720, "lasource", 10),
      dauphine:   trend(140, 340, "dauphine", 5),
      blossieres: trend(180, 420, "blossieres", 6),
    }},
  { id: "secu_ressentie", axis: "tranquillite", label: "Indice de sécurité ressentie", unit: "/100",
    source: "CITOYEN", positiveIsGood: true, category: "citoyenne",
    hint: "Enquête habitants — questionnaire 2023, 2026, 2029",
    series: {
      argonne:    sparse({ 2023: 42, 2026: 48, 2029: 55 }),
      lasource:   sparse({ 2023: 48, 2026: 53, 2029: 60 }),
      dauphine:   sparse({ 2023: 55, 2026: 60, 2029: 66 }),
      blossieres: sparse({ 2023: 51, 2026: 56, 2029: 62 }),
    }},
];

export const YEARS = Array.from({ length: 17 }, (_, i) => 2014 + i);

export function indicatorsByAxis(axis: AxisKey): Indicator[] {
  return INDICATORS.filter((i) => i.axis === axis);
}

export function valueAt(ind: Indicator, qpv: QPVKey, year: number): number | null {
  return ind.series[qpv][year] ?? null;
}

// Trouve la dernière valeur disponible <= year
export function latestValue(ind: Indicator, qpv: QPVKey, year: number): { year: number; value: number } | null {
  for (let y = year; y >= 2014; y--) {
    const v = ind.series[qpv][y];
    if (v !== null && v !== undefined) return { year: y, value: v };
  }
  return null;
}
