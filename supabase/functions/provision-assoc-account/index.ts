// Provision (create or update) the Supabase Auth user backing an association.
// Called by the superadmin after creating/editing an association in the table.
// Maps association.login → synthetic email "{slug}@assoc.associoboard.app"
// and assigns role 'admin_asso' + sets profile.assoc_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "assoc";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    if (userErr || !userData.user) return json(401, { error: "Non authentifié" });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isSuper = (roles ?? []).some((r) => r.role === "superadmin");
    if (!isSuper) return json(403, { error: "Réservé au superadmin" });

    const body = await req.json();
    const assocId = String(body.assoc_id ?? "");
    if (!assocId) return json(400, { error: "assoc_id requis" });

    // Load association
    const { data: assoc, error: assocErr } = await admin
      .from("associations").select("*").eq("id", assocId).maybeSingle();
    if (assocErr || !assoc) return json(404, { error: "Association introuvable" });

    const login = (assoc.login ?? "").trim();
    const password = assoc.password ?? "";
    if (!login || !password) return json(400, { error: "Identifiant et mot de passe requis sur l'association" });

    // Generate or reuse synthetic email
    let authEmail = assoc.auth_email as string | null;
    if (!authEmail) {
      authEmail = `${slugify(login)}-${assocId.slice(0, 8)}@assoc.associoboard.app`;
    }

    // Find or create auth user by email
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let authUser = list?.users.find((u) => (u.email ?? "").toLowerCase() === authEmail!.toLowerCase());
    let created = false;

    if (!authUser) {
      const { data: createData, error: createErr } = await admin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: { nom: assoc.nom, assoc_id: assocId },
      });
      if (createErr || !createData.user) return json(500, { error: createErr?.message ?? "Création impossible" });
      authUser = createData.user;
      created = true;
    } else {
      await admin.auth.admin.updateUserById(authUser.id, { password });
    }

    // Persist auth_email on association
    await admin.from("associations").update({ auth_email: authEmail }).eq("id", assocId);

    // Upsert profile with assoc_id
    await admin.from("profiles").upsert({
      id: authUser.id,
      email: authEmail,
      nom: assoc.nom,
      assoc_id: assocId,
    });

    // Ensure role admin_asso (clear viewer)
    await admin.from("user_roles").delete().eq("user_id", authUser.id);
    await admin.from("user_roles").insert({ user_id: authUser.id, role: "admin_asso" });

    // Mark any open access alerts for this assoc as resolved
    await admin.from("access_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("assoc_id", assocId).eq("resolved", false);

    return json(200, { ok: true, created, auth_email: authEmail });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
