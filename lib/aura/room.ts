import type { Sample } from "./pose";
import { getSupabase } from "./supabase";

export type RoomStatus = "lobby" | "preview" | "playing" | "reveal" | "finished";

export type RoomMode = "classic" | "royale";

export type Room = {
  id: string;
  code: string;
  status: RoomStatus;
  mode: RoomMode;
  round: number;
  round_started_at: string | null;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  name: string;
  joined_at: string;
};

export type Score = {
  id: string;
  room_id: string;
  player_id: string;
  round: number;
  aura: number;
  prec: number;
};

export type RoyaleState = {
  player_id: string;
  room_id: string;
  lives: number;
  combo: number;
  max_combo: number;
  aura: number;
  alive: boolean;
  updated_at: string;
};

const CODE_CHARS = "ACDEFGHJKMNPQRTUVWXYZ23456789";

export function makeCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export function makeSecret() {
  return crypto.randomUUID() + crypto.randomUUID();
}

function rpcError(e: { message?: string } | null) {
  return e?.message?.replace(/^.*ERROR:\s*/i, "").replace(/\s+CONTEXT:[\s\S]*$/, "") || "erreur inconnue";
}

export async function createRoom(code: string, hostToken: string) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("aura_create_room", { p_code: code, p_host_token: hostToken });
  if (error) throw new Error(rpcError(error));
  return data as { id: string; code: string };
}

export async function joinRoom(code: string, name: string, secret: string) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("aura_join_room", {
    p_code: code,
    p_name: name,
    p_secret: secret,
  });
  if (error) throw new Error(rpcError(error));
  return data as { id: string; room_id: string; name: string; code: string };
}

export async function advanceRoom(code: string, hostToken: string, status: RoomStatus, round: number) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("aura_advance", {
    p_code: code,
    p_host_token: hostToken,
    p_status: status,
    p_round: round,
  });
  if (error) throw new Error(rpcError(error));
  return data as { id: string; code: string; status: RoomStatus; round: number; round_started_at: string | null };
}

export async function setRoomMode(code: string, hostToken: string, mode: RoomMode) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("aura_set_mode", {
    p_code: code,
    p_host_token: hostToken,
    p_mode: mode,
  });
  if (error) throw new Error(rpcError(error));
  return data as { id: string; code: string; mode: RoomMode; status: RoomStatus };
}

export async function pulseRoyale(
  playerId: string,
  secret: string,
  state: { lives: number; combo: number; aura: number; alive: boolean; maxCombo: number },
) {
  const sb = getSupabase();
  const { error } = await sb.rpc("aura_royale_pulse", {
    p_player_id: playerId,
    p_secret: secret,
    p_lives: state.lives,
    p_combo: state.combo,
    p_aura: state.aura,
    p_alive: state.alive,
    p_max_combo: state.maxCombo,
  });
  if (error) throw new Error(rpcError(error));
}

export async function cutoffRoyale(code: string, hostToken: string, keep: number) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("aura_royale_cutoff", {
    p_code: code,
    p_host_token: hostToken,
    p_keep: keep,
  });
  if (error) throw new Error(rpcError(error));
  return data as { ok: boolean; keep: number; eliminated: number };
}

export async function submitScore(playerId: string, secret: string, round: number, aura: number, prec: number) {
  const sb = getSupabase();
  const { error } = await sb.rpc("aura_submit_score", {
    p_player_id: playerId,
    p_secret: secret,
    p_round: round,
    p_aura: aura,
    p_prec: prec,
  });
  if (error) throw new Error(rpcError(error));
}

export async function upsertSamples(code: string, hostToken: string, slug: string, samples: Sample[]) {
  const sb = getSupabase();
  const slim = samples.map((s) => ({
    t: s.t,
    a: s.a,
    lm: s.lm?.map((p) => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4), visibility: +(p.visibility ?? 1).toFixed(2) })),
  }));
  const { error } = await sb.rpc("aura_upsert_samples", {
    p_code: code,
    p_host_token: hostToken,
    p_slug: slug,
    p_samples: slim,
  });
  if (error) throw new Error(rpcError(error));
}

export async function fetchSamples(slug: string): Promise<Sample[] | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from("aura_move_samples").select("samples").eq("slug", slug).maybeSingle();
  if (error) throw new Error(rpcError(error));
  return (data?.samples as Sample[] | null) ?? null;
}

export async function fetchRoom(code: string) {
  const sb = getSupabase();
  const { data, error } = await sb.from("aura_rooms").select("id, code, status, mode, round, round_started_at, created_at").eq("code", code.toUpperCase()).maybeSingle();
  if (error) throw new Error(rpcError(error));
  return (data ? { ...data, mode: data.mode || "classic" } : null) as Room | null;
}

export async function fetchPlayers(roomId: string) {
  const sb = getSupabase();
  const { data, error } = await sb.from("aura_players").select("id, room_id, name, joined_at").eq("room_id", roomId).order("joined_at");
  if (error) throw new Error(rpcError(error));
  return (data ?? []) as Player[];
}

export async function fetchScores(roomId: string) {
  const sb = getSupabase();
  const { data, error } = await sb.from("aura_scores").select("id, room_id, player_id, round, aura, prec").eq("room_id", roomId);
  if (error) throw new Error(rpcError(error));
  return (data ?? []) as Score[];
}

export async function fetchRoyale(roomId: string) {
  const sb = getSupabase();
  const { data, error } = await sb.from("aura_royale").select("player_id, room_id, lives, combo, max_combo, aura, alive, updated_at").eq("room_id", roomId);
  if (error) throw new Error(rpcError(error));
  return (data ?? []) as RoyaleState[];
}
