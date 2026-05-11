// Public endpoint (no auth) — called from the login page when a non-superadmin
// user clicks "Mot de passe oublié". Creates an access_alert row visible to
// the superadmin only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const login = String(body.login ?? "").trim().slice(0, 200);
    if (!login) return json(400, { error: "Identifiant requis" });

    // Find association by login (case-insensitive)
    const { data: assocs } = await admin
      .from("associations").select("id, nom, login")
      .ilike("login", login).limit(1);
    const assoc = assocs?.[0];

    // Rate limit: don't create more than 1 alert per assoc/login per 5 min
    if (assoc) {
      const { data: recent } = await admin
        .from("access_alerts")
        .select("id")
        .eq("assoc_id", assoc.id)
        .eq("resolved", false)
        .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .limit(1);
      if (recent && recent.length > 0) {
        return json(200, { ok: true, deduped: true });
      }
    }

    const { error: insErr } = await admin.from("access_alerts").insert({
      assoc_id: assoc?.id ?? null,
      login_attempted: login,
      type: "forgot_password",
      message: assoc
        ? `${assoc.nom} a demandé une récupération d'accès.`
        : `Tentative de récupération avec un identifiant inconnu : "${login}".`,
    });
    if (insErr) return json(500, { error: insErr.message });

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
