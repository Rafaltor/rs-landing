/** Silhouette Mii unisexe — repères partagés (hauteur tête inchangée). */
export const HEAD_BASE_Y = 2.06;
export const HEAD_SKULL: [number, number, number] = [0.38, 0.5, 0.36];
export const HEAD_EAR_X = 0.355;
export const HEAD_EAR_SCALE: [number, number, number] = [0.05, 0.072, 0.056];
export const HAIR_CAP_R = 0.395;

export const NECK = { radius: 0.062, length: 0.14, y: 1.74 };

export const LIMBS = {
  /** Cuisses allongées pour garder les pieds au sol après remontée des hanches. */
  thighLen: 0.4,
  thighR: 0.075,
  calfLen: 0.18,
  calfR: 0.066,
  upLen: 0.3,
  upR: 0.072,
  foreLen: 0.26,
  foreR: 0.062,
  /** Hanches juste sous le bas de veste (profil torse ≈ 0,92). */
  hipY: 0.88,
  legSep: 0.086,
  hipBridge: [0.077, 0.077, 0.077] as [number, number, number],
  kneeBridge: [0.068, 0.068, 0.068] as [number, number, number],
  shoulderPad: [0.074, 0.074, 0.074] as [number, number, number],
  elbowBridge: [0.064, 0.064, 0.064] as [number, number, number],
};

/** Petit renfort sous la veste, masqué par le haut des cuisses. */
export const PELVIS = {
  y: 0.895,
  scale: [0.08, 0.065, 0.06] as [number, number, number],
};

export const SHOE = {
  soleW: 0.148,
  soleH: 0.04,
  soleD: 0.32,
};

/** Rotations de repos des pivots membres (radians) — source unique pour build + animations. */
export const REST_POSE = {
  shoulderZ: 0.16,
  elbowX: 0.07,
  hipX: 0,
  kneeX: 0,
} as const;
