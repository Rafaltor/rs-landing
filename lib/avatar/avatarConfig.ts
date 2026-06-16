import type { AvatarConfig } from "./palettes";

export const PSEUDO_MAX_LENGTH = 24;

/** Normalise le pseudo (trim, longueur max). */
export function normalizePseudo(value: string | undefined | null): string {
  if (!value) return "";
  return value.trim().slice(0, PSEUDO_MAX_LENGTH);
}

/** Normalise les indices de palette (entiers positifs). */
export function normalizeAvatarConfig(cfg: AvatarConfig): AvatarConfig {
  return {
    body: Math.max(0, Math.floor(cfg.body)),
    skin: Math.max(0, Math.floor(cfg.skin)),
    hair: Math.max(0, Math.floor(cfg.hair)),
    hairColor: Math.max(0, Math.floor(cfg.hairColor)),
    eyes: Math.max(0, Math.floor(cfg.eyes)),
    nose: Math.max(0, Math.floor(cfg.nose)),
    glasses: cfg.glasses,
    suit: Math.max(0, Math.floor(cfg.suit)),
    shirt: Math.max(0, Math.floor(cfg.shirt)),
    acc: Math.max(0, Math.floor(cfg.acc)),
    accColor: Math.max(0, Math.floor(cfg.accColor)),
    pseudo: normalizePseudo(cfg.pseudo),
  };
}
