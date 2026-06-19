import type { AvatarConfig } from "./palettes";
import { clampHex, migrateColorFields } from "./avatarColors";

export const PSEUDO_MAX_LENGTH = 24;

/** Normalise le pseudo (trim, longueur max). */
export function normalizePseudo(value: string | undefined | null): string {
  if (!value) return "";
  return value.trim().slice(0, PSEUDO_MAX_LENGTH);
}

/** Champs legacy ignorés à la lecture (ex. `body` des anciens MII). */
type LegacyAvatarFields = {
  body?: number;
  pants?: number;
};

type RawAvatarConfig = Partial<AvatarConfig> &
  LegacyAvatarFields & {
    skin?: number;
    hair?: number;
    hairColor?: number;
    eyes?: number;
    nose?: number;
    glasses?: boolean;
    suit?: number;
    shirt?: number;
    acc?: number;
    accColor?: number;
    pseudo?: string;
  };

/** Normalise indices de style + couleurs hex (migration index → hex à la lecture). */
export function normalizeAvatarConfig(cfg: RawAvatarConfig): AvatarConfig {
  const colors = migrateColorFields(cfg);

  return {
    skin: clampHex(colors.skin),
    hair: Math.max(0, Math.floor(cfg.hair ?? 0)),
    hairColor: clampHex(colors.hairColor),
    eyes: Math.max(0, Math.floor(cfg.eyes ?? 0)),
    nose: Math.max(0, Math.floor(cfg.nose ?? 0)),
    glasses: cfg.glasses ?? false,
    suit: clampHex(colors.suit),
    pants: clampHex(colors.pants),
    shirt: clampHex(colors.shirt),
    acc: Math.max(0, Math.floor(cfg.acc ?? 0)),
    accColor: clampHex(colors.accColor),
    pseudo: normalizePseudo(cfg.pseudo),
  };
}
