import {
  DEFAULT_AVATAR_CONFIG,
  type AvatarConfig,
} from "./palettes";
import { normalizeAvatarConfig } from "./avatarConfig";
import {
  COLOR_PROFILES,
  randomHueColor,
  randomSkinColor,
} from "./avatarColors";
import {
  deleteUserMii,
  fetchAllUserMiis,
  fetchUserMiiByUserId,
  insertUserMii,
  updateUserMii,
  type UserMiiRow,
} from "./miiRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const AVATAR_PLACEMENTS_CHANGED = "rs-avatar-placements-changed";
export const MAX_AVATAR_PLACEMENTS_PER_USER = 1;
/** @deprecated Alias explicite — un seul Mii par compte portail. */
export const MAX_MIIS_PER_ACCOUNT = MAX_AVATAR_PLACEMENTS_PER_USER;

export type AvatarPlacement = {
  id: string;
  pitch: number;
  yaw: number;
  config: AvatarConfig;
  userId: string;
};

export type AvatarPlacementsChangedDetail = {
  placements: AvatarPlacement[];
};

let cache: AvatarPlacement[] = [];
let hydrated = false;
let hydratePromise: Promise<AvatarPlacement[]> | null = null;

function rowToPlacement(row: UserMiiRow): AvatarPlacement {
  return {
    id: row.id,
    pitch: row.pitch,
    yaw: row.yaw,
    config: row.config,
    userId: row.user_id,
  };
}

function emitChange(placements: AvatarPlacement[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AvatarPlacementsChangedDetail>(AVATAR_PLACEMENTS_CHANGED, {
      detail: { placements },
    }),
  );
}

function setCache(placements: AvatarPlacement[]): AvatarPlacement[] {
  cache = placements;
  hydrated = true;
  emitChange(placements);
  return placements;
}

function randomConfig(): AvatarConfig {
  const r = (n: number) => Math.floor(Math.random() * n);
  return normalizeAvatarConfig({
    skin: randomSkinColor(),
    hair: r(12),
    hairColor: randomHueColor(COLOR_PROFILES.hair),
    eyes: r(10),
    nose: r(7),
    glasses: Math.random() > 0.45,
    suit: randomHueColor(COLOR_PROFILES.suit),
    pants: randomHueColor(COLOR_PROFILES.pants),
    shirt: randomHueColor(COLOR_PROFILES.shirt),
    acc: r(4),
    accColor: randomHueColor(COLOR_PROFILES.accent),
    pseudo: "",
  });
}

export function randomScenePosition(): { pitch: number; yaw: number } {
  return {
    pitch: -5 + Math.random() * 8,
    yaw: Math.random() * 300 - 150,
  };
}

/** Charge tous les Mii du salon depuis Supabase. */
export async function hydrateAvatarPlacements(): Promise<AvatarPlacement[]> {
  if (!isSupabaseConfigured()) {
    return setCache([]);
  }
  const rows = await fetchAllUserMiis();
  return setCache(rows.map(rowToPlacement));
}

export function ensureAvatarPlacementsHydrated(): Promise<AvatarPlacement[]> {
  if (hydrated) return Promise.resolve(cache);
  if (!hydratePromise) {
    hydratePromise = hydrateAvatarPlacements().finally(() => {
      hydratePromise = null;
    });
  }
  return hydratePromise;
}

export function isAvatarPlacementsHydrated(): boolean {
  return hydrated;
}

export function getAvatarPlacements(): AvatarPlacement[] {
  return cache;
}

export function getAvatarPlacement(id: string): AvatarPlacement | undefined {
  return cache.find((p) => p.id === id);
}

export function countPlacementsForUser(userId: string): number {
  return cache.filter((p) => p.userId === userId).length;
}

export function getMyAvatarPlacement(userId: string): AvatarPlacement | undefined {
  return cache.find((p) => p.userId === userId);
}

/** Crée le Mii du compte (1 max). Retourne l'existant s'il y en a déjà un. */
export async function ensureMyAvatarPlacement(
  userId: string,
  config: AvatarConfig = randomConfig(),
): Promise<AvatarPlacement | null> {
  if (!isSupabaseConfigured()) return null;

  const inCache = getMyAvatarPlacement(userId);
  if (inCache) return inCache;

  const existing = await fetchUserMiiByUserId(userId);
  if (existing) {
    const placement = rowToPlacement(existing);
    if (!cache.some((p) => p.id === placement.id)) {
      setCache([...cache, placement]);
    }
    return placement;
  }

  return addAvatarPlacement(userId, config);
}

/** Crée un Mii (nécessite session Google, 1 par compte). */
export async function addAvatarPlacement(
  userId: string,
  config: AvatarConfig = randomConfig(),
): Promise<AvatarPlacement | null> {
  if (!isSupabaseConfigured()) return null;
  if (countPlacementsForUser(userId) >= MAX_AVATAR_PLACEMENTS_PER_USER) {
    return null;
  }

  const pos = randomScenePosition();
  const row = await insertUserMii({
    userId,
    pitch: pos.pitch,
    yaw: pos.yaw,
    config: normalizeAvatarConfig(config),
  });

  const placement = rowToPlacement(row);
  setCache([...cache, placement]);
  return placement;
}

export async function removeAvatarPlacement(
  id: string,
  userId: string,
): Promise<boolean> {
  const target = cache.find((p) => p.id === id);
  if (!target || target.userId !== userId) return false;

  await deleteUserMii(id);
  setCache(cache.filter((p) => p.id !== id));
  return true;
}

export async function updateAvatarPlacement(
  id: string,
  userId: string,
  patch: Partial<Pick<AvatarPlacement, "config" | "pitch" | "yaw">>,
): Promise<AvatarPlacement | null> {
  const target = cache.find((p) => p.id === id);
  if (!target || target.userId !== userId) return null;

  const row = await updateUserMii(id, {
    pitch: patch.pitch,
    yaw: patch.yaw,
    config: patch.config ? normalizeAvatarConfig(patch.config) : undefined,
  });

  const updated = rowToPlacement(row);
  setCache(cache.map((p) => (p.id === id ? updated : p)));
  return updated;
}

export function subscribeAvatarPlacements(
  handler: (placements: AvatarPlacement[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<AvatarPlacementsChangedDetail>).detail;
    if (detail?.placements) handler(detail.placements);
  };

  window.addEventListener(AVATAR_PLACEMENTS_CHANGED, onCustom);
  return () => {
    window.removeEventListener(AVATAR_PLACEMENTS_CHANGED, onCustom);
  };
}

export function hotspotIdForPlacement(placementId: string): string {
  return `rs-avatar-${placementId}`;
}

/** Rafraîchit le cache depuis la BDD (après login, etc.). */
export async function refreshAvatarPlacementsFromDb(): Promise<AvatarPlacement[]> {
  hydrated = false;
  return hydrateAvatarPlacements();
}

export { DEFAULT_AVATAR_CONFIG, randomConfig };
