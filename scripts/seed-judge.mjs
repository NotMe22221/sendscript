import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_EMAIL ?? "judge@spendscript.dev";
const password = process.env.DEMO_PASSWORD;
if (!url || !serviceKey || !password) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DEMO_PASSWORD in .env.local first.");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Maya Chen" } });
if (error && !error.message.toLowerCase().includes("already")) throw error;

let userId = data.user?.id;
if (!userId) {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  userId = users.users.find((user) => user.email === email)?.id;
}
if (!userId) throw new Error("Could not resolve the judge user.");

const { error: profileError } = await supabase.from("profiles").upsert({ id: userId, full_name: "Maya Chen", email });
if (profileError) throw profileError;
const { error: memberError } = await supabase.from("memberships").upsert({ organization_id: "10000000-0000-4000-8000-000000000001", user_id: userId, role: "admin" });
if (memberError) throw memberError;
process.stdout.write(`Judge account ready: ${email}\n`);
