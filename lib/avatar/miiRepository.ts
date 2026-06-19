import { createClient } from "@/lib/supabase/client";
import type { AvatarConfig } from "./palettes";
import { normalizeAvatarConfig } from "./avatarConfig";

export type UserMiiRow = {
  id: string;
  user_id: string;
  pitch: number;
  yaw: number;
  config: AvatarConfig;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function parseConfig(value: unknown): AvatarConfig | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.skin !== "number" ||
    typeof v.hair !== "number" ||
    typeof v.hairColor !== "number" ||
    typeof v.eyes !== "number" ||
    typeof v.nose !== "number" ||
    typeof v.glasses !== "boolean" ||
    typeof v.suit !== "number" ||
    typeof v.shirt !== "number" ||
    typeof v.acc !== "number" ||
    typeof v.accColor !== "number"
  ) {
    return null;
  }
  return normalizeAvatarConfig({
    skin: v.skin as number,
    hair: v.hair as number,
    hairColor: v.hairColor as number,
    eyes: v.eyes as number,
    nose: v.nose as number,
    glasses: v.glasses as boolean,
    suit: v.suit as number,
    shirt: v.shirt as number,
    acc: v.acc as number,
    accColor: v.accColor as number,
    pseudo: typeof v.pseudo === "string" ? v.pseudo : "",
    body: typeof v.body === "number" ? v.body : undefined,
  });
}

function rowToMii(row: Record<string, unknown>): UserMiiRow | null {
  const config = parseConfig(row.config);
  if (!config) return null;
  if (typeof row.id !== "string" || typeof row.user_id !== "string") return null;
  return {
    id: row.id,
    user_id: row.user_id,
    pitch: Number(row.pitch),
    yaw: Number(row.yaw),
    config,
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function fetchUserMiiByUserId(
  userId: string,
): Promise<UserMiiRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_miis")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToMii(data as Record<string, unknown>);
}

export async function fetchAllUserMiis(): Promise<UserMiiRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_miis")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data
    .map((row) => rowToMii(row as Record<string, unknown>))
    .filter((row): row is UserMiiRow => row !== null);
}

export async function countUserMiisForUser(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("user_miis")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

export async function insertUserMii(input: {
  userId: string;
  pitch: number;
  yaw: number;
  config: AvatarConfig;
  sortOrder?: number;
}): Promise<UserMiiRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_miis")
    .insert({
      user_id: input.userId,
      pitch: input.pitch,
      yaw: input.yaw,
      config: normalizeAvatarConfig(input.config),
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  const parsed = rowToMii(data as Record<string, unknown>);
  if (!parsed) throw new Error("Réponse Mii invalide");
  return parsed;
}

export async function updateUserMii(
  id: string,
  patch: Partial<Pick<UserMiiRow, "pitch" | "yaw" | "config" | "sort_order">>,
): Promise<UserMiiRow> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (patch.pitch !== undefined) payload.pitch = patch.pitch;
  if (patch.yaw !== undefined) payload.yaw = patch.yaw;
  if (patch.config !== undefined) {
    payload.config = normalizeAvatarConfig(patch.config);
  }
  if (patch.sort_order !== undefined) payload.sort_order = patch.sort_order;

  const { data, error } = await supabase
    .from("user_miis")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  const parsed = rowToMii(data as Record<string, unknown>);
  if (!parsed) throw new Error("Réponse Mii invalide");
  return parsed;
}

export async function deleteUserMii(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("user_miis").delete().eq("id", id);
  if (error) throw error;
}
