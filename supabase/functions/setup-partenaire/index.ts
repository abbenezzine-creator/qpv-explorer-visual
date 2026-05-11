// Provision (or refresh) the global "Partenaire" account.
// Creates the auth user if missing, sets/updates the password, ensures
// the 'partenaire' role is assigned. Only callable by superadmins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PARTENAIRE_EMAIL = "partenaire@associoboard.app";
const PARTENAIRE_PASSWORD = "Partenaire2025";
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

    // Find existing user by email
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let partUser = list?.users.find((u) => (u.email ?? "").toLowerCase() === PARTENAIRE_EMAIL);
    let created = false;

    if (!partUser) {
      const { data: createData, error: createErr } = await admin.auth.admin.createUser({
        email: PARTENAIRE_EMAIL,
        password: PARTENAIRE_PASSWORD,
        email_confirm: true,
        user_metadata: { nom: PARTENAIRE_NOM },
      });
      if (createErr || !createData.user) {
        return new Response(JSON.stringify({ error: createErr?.message ?? "Création impossible" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      partUser = createData.user;
      created = true;
    } else {
      // Reset password to known value
      await admin.auth.admin.updateUserById(partUser.id, { password: PARTENAIRE_PASSWORD });
    }

    // Ensure profile
    await admin.from("profiles").upsert({
      id: partUser.id,
      email: PARTENAIRE_EMAIL,
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
        email: PARTENAIRE_EMAIL,
        password: PARTENAIRE_PASSWORD,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
