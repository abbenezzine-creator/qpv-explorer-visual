// Auth helpers backed by Supabase. Keeps the AbUser shape used across the app.
import { supabase } from "@/integrations/supabase/client";

export type Role = "superadmin" | "admin_asso" | "agent" | "viewer";

export type AbUser = {
  id: string;
  login: string; // email
  email: string;
  role: Role;
  assocId: string | null;
  nom: string;
};

const KEY = "abUser";
let current: AbUser | null = null;
let listenerInit = false;

function broadcast() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ab-auth-change"));
}

function persist(u: AbUser | null) {
  current = u;
  if (typeof window === "undefined") return;
  if (u) sessionStorage.setItem(KEY, JSON.stringify(u));
  else sessionStorage.removeItem(KEY);
  broadcast();
}

export function getUser(): AbUser | null {
  if (current) return current;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      current = JSON.parse(raw) as AbUser;
      return current;
    }
  } catch { /* noop */ }
  return null;
}

const ROLE_PRIORITY: Role[] = ["superadmin", "admin_asso", "agent", "viewer"];

async function loadProfile(userId: string, email: string): Promise<AbUser> {
  const [profileRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("nom, assoc_id, email").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const userRoles = (rolesRes.data ?? []).map((r) => r.role as Role);
  const role = ROLE_PRIORITY.find((r) => userRoles.includes(r)) ?? "viewer";
  const u: AbUser = {
    id: userId,
    login: email,
    email,
    role,
    assocId: (profileRes.data?.assoc_id as string | null) ?? null,
    nom: profileRes.data?.nom ?? email.split("@")[0],
  };
  persist(u);
  return u;
}

export async function login(email: string, password: string): Promise<{ user: AbUser | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) return { user: null, error: error?.message ?? "Identifiants invalides" };
  const u = await loadProfile(data.user.id, data.user.email ?? email);
  return { user: u, error: null };
}

export async function signup(email: string, password: string, nom?: string): Promise<{ ok: boolean; needsConfirm: boolean; error: string | null }> {
  const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/app?page=dashboard` : undefined;
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: redirectUrl, data: nom ? { nom } : undefined },
  });
  if (error) return { ok: false, needsConfirm: false, error: error.message };
  if (data.user && data.session) {
    await loadProfile(data.user.id, data.user.email ?? email);
    return { ok: true, needsConfirm: false, error: null };
  }
  return { ok: true, needsConfirm: true, error: null };
}

export async function requestPasswordReset(email: string): Promise<{ ok: boolean; error: string | null }> {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

export async function updatePassword(newPassword: string): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

export async function logout() {
  await supabase.auth.signOut();
  persist(null);
}

export async function refreshFromSession(): Promise<AbUser | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) {
    persist(null);
    return null;
  }
  return await loadProfile(data.session.user.id, data.session.user.email ?? "");
}

export function initAuthListener() {
  if (typeof window === "undefined" || listenerInit) return;
  listenerInit = true;
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      persist(null);
      return;
    }
    // Defer Supabase calls inside the callback to avoid lock contention.
    setTimeout(() => {
      void loadProfile(session.user.id, session.user.email ?? "");
    }, 0);
  });
  // Hydrate once on init.
  void refreshFromSession();
}
