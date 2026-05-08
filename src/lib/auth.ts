// Lightweight client-side auth shared between React shell and the AssocioBoard iframe.
// Mirrors the ACCOUNTS table in public/associoboard.html.

export type Role = "superadmin" | "association";

export type AbUser = {
  login: string;
  role: Role;
  assocId: number | null;
  nom: string;
};

export const ACCOUNTS: Record<string, { pwd: string; role: Role; assocId: number | null; nom: string }> = {
  admin:      { pwd: "admin2025",  role: "superadmin", assocId: null, nom: "Super Administrateur" },
  action:     { pwd: "action2025", role: "association", assocId: 1,    nom: "ACTION" },
  passemploi: { pwd: "pass2025",   role: "association", assocId: 2,    nom: "PASS'EMPLOI" },
  atlas:      { pwd: "atlas2025",  role: "association", assocId: 3,    nom: "ATLAS ETRE ET SAVOIR" },
  laos:       { pwd: "laos2025",   role: "association", assocId: 4,    nom: "DES JEUNES DU LAOS" },
};

const KEY = "abUser";

export function getUser(): AbUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AbUser) : null;
  } catch {
    return null;
  }
}

export function setUser(u: AbUser | null) {
  if (typeof window === "undefined") return;
  if (u) sessionStorage.setItem(KEY, JSON.stringify(u));
  else sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event("ab-auth-change"));
}

export function login(loginId: string, pwd: string): AbUser | null {
  const acc = ACCOUNTS[loginId.trim().toLowerCase()];
  if (!acc || acc.pwd !== pwd) return null;
  const u: AbUser = { login: loginId.trim().toLowerCase(), role: acc.role, assocId: acc.assocId, nom: acc.nom };
  setUser(u);
  return u;
}

export function logout() {
  setUser(null);
}
