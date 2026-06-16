#!/usr/bin/env node
/**
 * Met à jour les Redirect URLs Supabase pour rs-landing.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/patch-supabase-redirects.mjs
 *
 * Token: https://supabase.com/dashboard/account/tokens
 */

const PROJECT_REF = "jdzjquxslokedstzigwn";

const REQUIRED = [
  "http://localhost:3000/**",
  "http://127.0.0.1:3000/**",
  "https://rs-landing.vercel.app/**",
  "https://*-.vercel.app/**",
  "https://landing.recrutestagiaire.eu/**",
];

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Définir SUPABASE_ACCESS_TOKEN (dashboard Supabase → Account → Tokens)");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const getRes = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
  { headers },
);
if (!getRes.ok) {
  console.error("GET config failed:", getRes.status, await getRes.text());
  process.exit(1);
}

const current = await getRes.json();
const existing = (current.uri_allow_list || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const merged = [...new Set([...existing, ...REQUIRED])];
const uri_allow_list = merged.join(",");

const patchRes = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
  {
    method: "PATCH",
    headers,
    body: JSON.stringify({ uri_allow_list }),
  },
);

if (!patchRes.ok) {
  console.error("PATCH config failed:", patchRes.status, await patchRes.text());
  process.exit(1);
}

console.log("uri_allow_list mis à jour:");
console.log(uri_allow_list);
