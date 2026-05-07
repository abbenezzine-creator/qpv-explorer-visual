export type QPVKey = "argonne" | "lasource" | "dauphine" | "blossieres";

export interface QPV {
  key: QPVKey;
  name: string;
  short: string;
  description: string;
  population2014: number;
  population2024: number;
  revenue2014: number; // revenu médian annuel €
  revenue2024: number;
  povertyRate: number; // %
  safetyFeeling: number; // /100 (enquête citoyenne 2023)
  servicesAccess: number; // /100
  unemployment: number; // %
  under25: number; // % de la population
  sentiment: {
    improvement: number; // %
    stable: number;
    degradation: number;
  };
}

export const QPVS: QPV[] = [
  {
    key: "argonne",
    name: "L'Argonne",
    short: "ARG",
    description: "Quartier nord-est d'Orléans, en pleine rénovation urbaine.",
    population2014: 8480,
    population2024: 7471,
    revenue2014: 12800,
    revenue2024: 14200,
    povertyRate: 38,
    safetyFeeling: 42,
    servicesAccess: 64,
    unemployment: 24,
    under25: 41,
    sentiment: { improvement: 21, stable: 46, degradation: 33 },
  },
  {
    key: "lasource",
    name: "La Source",
    short: "SRC",
    description: "Plus grand QPV d'Orléans, au sud, université et CHRO.",
    population2014: 10210,
    population2024: 11284,
    revenue2014: 13100,
    revenue2024: 14850,
    povertyRate: 34,
    safetyFeeling: 48,
    servicesAccess: 72,
    unemployment: 22,
    under25: 39,
    sentiment: { improvement: 28, stable: 44, degradation: 28 },
  },
  {
    key: "dauphine",
    name: "Dauphine",
    short: "DPH",
    description: "Quartier sud, secteur résidentiel en transformation.",
    population2014: 3120,
    population2024: 2980,
    revenue2014: 13900,
    revenue2024: 15400,
    povertyRate: 29,
    safetyFeeling: 55,
    servicesAccess: 68,
    unemployment: 18,
    under25: 34,
    sentiment: { improvement: 32, stable: 45, degradation: 23 },
  },
  {
    key: "blossieres",
    name: "Les Blossières",
    short: "BLO",
    description: "Quartier nord-ouest, mixité d'habitat collectif et pavillonnaire.",
    population2014: 4760,
    population2024: 4520,
    revenue2014: 13400,
    revenue2024: 15050,
    povertyRate: 31,
    safetyFeeling: 51,
    servicesAccess: 70,
    unemployment: 20,
    under25: 36,
    sentiment: { improvement: 25, stable: 47, degradation: 28 },
  },
];

export const CITIZEN_QUOTES = [
  { quartier: "L'Argonne", quote: "Les nouveaux équipements changent la vie du quartier, mais on attend encore les commerces.", author: "Habitante, 47 ans" },
  { quartier: "La Source", quote: "L'arrivée du tram a tout transformé. On se sent mieux relié à la ville.", author: "Étudiant, 22 ans" },
  { quartier: "Dauphine", quote: "Le sentiment de sécurité s'est amélioré le soir, surtout depuis la rénovation.", author: "Retraité, 68 ans" },
  { quartier: "Les Blossières", quote: "On manque encore de lieux pour les jeunes, mais l'ambiance reste familiale.", author: "Animatrice associative" },
];
