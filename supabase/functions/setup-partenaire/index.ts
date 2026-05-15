// Provision (or refresh) the global "Partenaire" account.
// Creates the auth user if missing, sets/updates the password, ensures
// the 'partenaire' role is assigned. Only callable by superadmins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PARTENAIRE_EMAIL = "partenaire@associoboard.app";
const DEFAULT_PARTENAIRE_PASSWORD = "Partenaire2025";
const PARTENAIRE_NOM = "Partenaire";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is superadmin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isSuper = (roles ?? []).some((r) => r.role === "superadmin");
    if (!isSuper) {
      return new Response(JSON.stringify({ error: "Réservé au superadmin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional overrides from request body. `email` may be a real email OR a plain identifier.
    let bodyEmail: string | undefined;
    let bodyPassword: string | undefined;
    try {
      if (req.headers.get("content-type")?.includes("application/json")) {
        const b = await req.json();
        if (typeof b?.email === "string" && b.email.trim()) {
          const raw = b.email.trim().toLowerCase();
          if (raw.includes("@")) {
            bodyEmail = raw;
          } else {
            // Identifiant simple → email synthétique
            const id = raw.replace(/[^a-z0-9._-]/g, "");
            if (id) bodyEmail = `${id}@partenaire.local`;
          }
        }
        if (typeof b?.password === "string" && b.password.length >= 6) bodyPassword = b.password;
      }
    } catch { /* noop */ }

    // Find existing partenaire by role (so we can update its email even if changed)
    const { data: roleRows } = await admin.from("user_roles").select("user_id").eq("role", "partenaire").limit(1);
    let partUser: { id: string; email?: string | null } | null = null;
    if (roleRows && roleRows.length > 0) {
      const { data: u } = await admin.auth.admin.getUserById(roleRows[0].user_id);
      if (u?.user) partUser = { id: u.user.id, email: u.user.email };
    }
    if (!partUser) {
      // Fallback: lookup by default email
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users.find((u) => (u.email ?? "").toLowerCase() === DEFAULT_PARTENAIRE_EMAIL);
      if (found) partUser = { id: found.id, email: found.email };
    }

    const targetEmail = bodyEmail ?? partUser?.email ?? DEFAULT_PARTENAIRE_EMAIL;
    const targetPassword = bodyPassword ?? DEFAULT_PARTENAIRE_PASSWORD;
    let created = false;

    if (!partUser) {
      const { data: createData, error: createErr } = await admin.auth.admin.createUser({
        email: targetEmail,
        password: targetPassword,
        email_confirm: true,
        user_metadata: { nom: PARTENAIRE_NOM },
      });
      if (createErr || !createData.user) {
        return new Response(JSON.stringify({ error: createErr?.message ?? "Création impossible" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      partUser = { id: createData.user.id, email: createData.user.email };
      created = true;
    } else {
      const updates: { password: string; email?: string; email_confirm?: boolean } = { password: targetPassword };
      if (bodyEmail && bodyEmail !== (partUser.email ?? "").toLowerCase()) {
        updates.email = bodyEmail;
        updates.email_confirm = true;
      }
      const { error: updErr } = await admin.auth.admin.updateUserById(partUser.id, updates);
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Ensure profile
    await admin.from("profiles").upsert({
      id: partUser.id,
      email: targetEmail,
      nom: PARTENAIRE_NOM,
    });

    // Ensure 'partenaire' role assigned (and remove default 'viewer' if present)
    await admin.from("user_roles").delete().eq("user_id", partUser.id);
    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: partUser.id,
      role: "partenaire",
    });
    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        created,
        email: targetEmail,
        password: targetPassword,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
