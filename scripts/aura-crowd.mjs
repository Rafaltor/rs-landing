import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    if (process.env[k]) continue;
    process.env[k] = t.slice(i + 1).replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const code = (process.argv[2] || "").trim().toUpperCase();
const count = Math.max(1, Math.min(40, Number(process.argv[3] || 30)));

if (!code || !url || !key) {
  console.error("Usage: npm run crowd -- CODE [nombre]");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function rpcError(error) {
  return (error?.message || "erreur inconnue").replace(/^.*ERROR:\s*/i, "").replace(/\s+CONTEXT:[\s\S]*$/, "");
}

const { data: room, error: roomError } = await sb
  .from("aura_rooms")
  .select("id, code, status, mode, round")
  .eq("code", code)
  .maybeSingle();

if (roomError || !room) {
  console.error(roomError ? rpcError(roomError) : "Salon introuvable. Ouvre d'abord la page hôte.");
  process.exit(1);
}
if (room.status === "finished") {
  console.error("La soirée est finie. Relance un salon.");
  process.exit(1);
}

const bots = [];
for (let i = 0; i < count; i++) {
  const name = `Foule ${i + 1}`;
  const secret = crypto.randomUUID() + crypto.randomUUID();
  const { data, error } = await sb.rpc("aura_join_room", { p_code: code, p_name: name, p_secret: secret });
  if (error || !data) {
    console.error(name, error ? rpcError(error) : "join vide");
    continue;
  }
  bots.push({ id: data.id, name: data.name, secret, sentRound: -1, aura: (i + 1) * 400 });
  await new Promise((r) => setTimeout(r, 40));
}

if (!bots.length) {
  console.error("Aucun joueur ajouté.");
  process.exit(1);
}

const channels = bots.map((_, i) =>
  sb
    .channel(`crowd-${room.id}-${i}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "aura_rooms", filter: `id=eq.${room.id}` }, () => {})
    .on("postgres_changes", { event: "*", schema: "public", table: "aura_players", filter: `room_id=eq.${room.id}` }, () => {})
    .subscribe(),
);

console.log(`${bots.length} joueurs dans ${code}. Lance la partie sur l'hôte. Ctrl+C pour arrêter (ils restent dans le salon).`);

let stop = false;
process.on("SIGINT", () => {
  stop = true;
});

while (!stop) {
  const { data, error } = await sb.from("aura_rooms").select("id, status, mode, round").eq("code", code).maybeSingle();
  if (error || !data) {
    console.error(error ? rpcError(error) : "Salon perdu");
  } else if (data.mode === "royale" && data.status === "playing") {
    await Promise.all(bots.map(async (b, i) => {
      b.aura += 80 + (i % 5) * 20;
      const { error: pulseError } = await sb.rpc("aura_royale_pulse", {
        p_player_id: b.id,
        p_secret: b.secret,
        p_lives: 0,
        p_combo: i % 4,
        p_aura: b.aura,
        p_alive: true,
        p_max_combo: i % 4,
      });
      if (pulseError) console.error(b.name, rpcError(pulseError));
    }));
    console.log(`royale · ${bots.length} pulsations`);
  } else if (data.mode !== "royale" && data.status === "playing") {
    const pending = bots.filter((b) => b.sentRound !== data.round);
    await Promise.all(pending.map(async (b, i) => {
      const { error: scoreError } = await sb.rpc("aura_submit_score", {
        p_player_id: b.id,
        p_secret: b.secret,
        p_round: data.round,
        p_aura: 800 + ((i * 137) % 7000),
        p_prec: 40 + (i % 55),
      });
      if (scoreError) console.error(b.name, rpcError(scoreError));
      else b.sentRound = data.round;
    }));
    if (pending.length) console.log(`manche ${data.round + 1} · ${pending.length} scores`);
  }
  await new Promise((r) => setTimeout(r, 2500));
}

for (const ch of channels) sb.removeChannel(ch);
process.exit(0);
