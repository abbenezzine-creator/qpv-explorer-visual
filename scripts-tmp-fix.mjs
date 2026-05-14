import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPER_EMAIL = "ab.benezzine@gmail.com";
const SUPER_PWD = "Benezzine2025";
const SUPER_PROFILE_ID = "adb686ff-85fe-497d-919d-57149a338891";
const DUP_AUTH_ID = "24d9e0f6-642f-4354-9788-3707fabd4a8f";
const HIJACK_ASSOC_ID = "b4746d66-8e7c-4a09-be0b-3d9e402ebfb5";

// 1) Delete the conflicting association (its login = ab.benezzine@gmail.com hijacks superadmin)
const { error: delAssocErr } = await admin.from("associations").delete().eq("id", HIJACK_ASSOC_ID);
console.log("delete hijack association:", delAssocErr ?? "ok");

// 2) Delete the duplicate auth user + profile + roles
await admin.from("user_roles").delete().eq("user_id", DUP_AUTH_ID);
await admin.from("profiles").delete().eq("id", DUP_AUTH_ID);
const { error: delUserErr } = await admin.auth.admin.deleteUser(DUP_AUTH_ID);
console.log("delete dup auth user:", delUserErr ?? "ok");

// 3) Reset password on the real superadmin auth user + ensure email_confirm + clear assoc_id + ensure role
const { error: updErr } = await admin.auth.admin.updateUserById(SUPER_PROFILE_ID, {
  password: SUPER_PWD, email: SUPER_EMAIL, email_confirm: true,
});
console.log("reset superadmin password:", updErr ?? "ok");

await admin.from("profiles").upsert({ id: SUPER_PROFILE_ID, email: SUPER_EMAIL, nom: "Super Administrateur", assoc_id: null });
await admin.from("user_roles").delete().eq("user_id", SUPER_PROFILE_ID);
await admin.from("user_roles").insert({ user_id: SUPER_PROFILE_ID, role: "superadmin" });

console.log("done");
