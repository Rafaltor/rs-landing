/**
 * Couleurs avatar : entiers hex 0xRRGGBB (ex. 0xf6cda6).
 * Les anciennes palettes (SKIN, SUIT…) servent uniquement à la migration index → hex.
 */
import {
  ACCC,
  HAIRC,
  SHIRT,
  SKIN,
  SUIT,
} from "./palettes";

export type HueColorProfile = {
  s: number;
  l: number;
};

export const COLOR_PROFILES = {
  hair: { s: 0.42, l: 0.32 },
  suit: { s: 0.32, l: 0.34 },
  pants: { s: 0.28, l: 0.22 },
  shirt: { s: 0.12, l: 0.92 },
  accent: { s: 0.58, l: 0.48 },
} as const satisfies Record<string, HueColorProfile>;

export function hexToCss(hex: number): string {
  return `#${(hex & 0xffffff).toString(16).padStart(6, "0")}`;
}

export function clampHex(hex: number): number {
  if (!Number.isFinite(hex)) return 0xffffff;
  return Math.max(0, Math.min(0xffffff, Math.floor(hex)));
}

function isLegacyPaletteIndex(value: number, palette: readonly number[]): boolean {
  return Number.isInteger(value) && value >= 0 && value < palette.length;
}

/** Convertit un ancien index de palette en couleur hex. */
export function migratePaletteColor(
  value: number,
  palette: readonly number[],
): number {
  if (isLegacyPaletteIndex(value, palette)) {
    return palette[value];
  }
  return clampHex(value);
}

export function darkenHex(hex: number, factor: number): number {
  const r = Math.floor(((hex >> 16) & 0xff) * factor);
  const g = Math.floor(((hex >> 8) & 0xff) * factor);
  const b = Math.floor((hex & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

export function hslToHex(h: number, s: number, l: number): number {
  const hh = ((h % 360) + 360) % 360 / 360;
  const ss = Math.max(0, Math.min(1, s));
  const ll = Math.max(0, Math.min(1, l));

  if (ss === 0) {
    const v = Math.round(ll * 255);
    return (v << 16) | (v << 8) | v;
  }

  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;

  const hueToRgb = (t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const r = Math.round(hueToRgb(hh + 1 / 3) * 255);
  const g = Math.round(hueToRgb(hh) * 255);
  const b = Math.round(hueToRgb(hh - 1 / 3) * 255);
  return (r << 16) | (g << 8) | b;
}

export function hexToHue(hex: number): number {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.0001) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
}

export function skinRampGradient(): string {
  return `linear-gradient(to right, ${SKIN.map((c) => hexToCss(c)).join(", ")})`;
}

export function skinSliderFromHex(hex: number): number {
  const target = clampHex(hex);
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < SKIN.length; i += 1) {
    const c = SKIN[i];
    const dr = ((target >> 16) & 0xff) - ((c >> 16) & 0xff);
    const dg = ((target >> 8) & 0xff) - ((c >> 8) & 0xff);
    const db = (target & 0xff) - (c & 0xff);
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  if (SKIN.length <= 1) return 0;
  return Math.round((bestIdx / (SKIN.length - 1)) * 100);
}

export function skinHexFromSlider(t: number): number {
  const clamped = Math.max(0, Math.min(100, t));
  if (SKIN.length <= 1) return SKIN[0];
  const pos = (clamped / 100) * (SKIN.length - 1);
  const i0 = Math.floor(pos);
  const i1 = Math.min(SKIN.length - 1, i0 + 1);
  const f = pos - i0;
  const c0 = SKIN[i0];
  const c1 = SKIN[i1];
  const r = Math.round(((c0 >> 16) & 0xff) * (1 - f) + ((c1 >> 16) & 0xff) * f);
  const g = Math.round(((c0 >> 8) & 0xff) * (1 - f) + ((c1 >> 8) & 0xff) * f);
  const b = Math.round((c0 & 0xff) * (1 - f) + (c1 & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

export function hueRampGradient(): string {
  const stops = [0, 30, 60, 120, 180, 240, 300, 360].map(
    (h) => `${hexToCss(hslToHex(h, 0.55, 0.48))} ${(h / 360) * 100}%`,
  );
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

export function hueColorFromSlider(
  t: number,
  profile: HueColorProfile,
): number {
  const hue = Math.max(0, Math.min(360, t));
  return hslToHex(hue, profile.s, profile.l);
}

export function randomSkinColor(): number {
  return skinHexFromSlider(Math.random() * 100);
}

export function randomHueColor(profile: HueColorProfile): number {
  return hslToHex(Math.random() * 360, profile.s, profile.l);
}

export type LegacyColorConfig = {
  skin?: number;
  hairColor?: number;
  suit?: number;
  pants?: number;
  shirt?: number;
  accColor?: number;
};

/** Migration douce index → hex + pants manquant dérivé du haut. */
export function migrateColorFields(raw: LegacyColorConfig): {
  skin: number;
  hairColor: number;
  suit: number;
  pants: number;
  shirt: number;
  accColor: number;
} {
  const suit = migratePaletteColor(raw.suit ?? 0, SUIT);
  const pantsRaw = raw.pants;
  const pants =
    pantsRaw === undefined
      ? darkenHex(suit, 0.72)
      : migratePaletteColor(pantsRaw, SUIT);

  return {
    skin: migratePaletteColor(raw.skin ?? 1, SKIN),
    hairColor: migratePaletteColor(raw.hairColor ?? 1, HAIRC),
    suit,
    pants,
    shirt: migratePaletteColor(raw.shirt ?? 0, SHIRT),
    accColor: migratePaletteColor(raw.accColor ?? 1, ACCC),
  };
}

/** Couleur accent par défaut depuis la config (hex). */
export function accentFromConfig(accColor: number): number {
  return clampHex(accColor);
}
