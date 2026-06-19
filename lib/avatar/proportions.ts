/** Silhouette Mii — repères partagés (hauteur tête inchangée). */
export const HEAD_BASE_Y = 2.06;
export const HEAD_SKULL: [number, number, number] = [0.38, 0.5, 0.36];
export const HEAD_EAR_X = 0.355;
export const HEAD_EAR_SCALE: [number, number, number] = [0.05, 0.072, 0.056];
export const HAIR_CAP_R = 0.395;

export const NECK = { radius: 0.062, length: 0.14, y: 1.74 };

export const LIMBS = {
  thighLen: 0.2,
  thighR: 0.075,
  calfLen: 0.18,
  calfR: 0.066,
  upLen: 0.3,
  upR: 0.072,
  foreLen: 0.26,
  foreR: 0.062,
  /** Hanche calibrée : jambes sous la veste, pieds au sol (y ≈ 0). */
  hipY: 0.679,
  legSep: { homme: 0.082, femme: 0.09 } as const,
  hipBridge: [0.077, 0.077, 0.077] as [number, number, number],
  kneeBridge: [0.068, 0.068, 0.068] as [number, number, number],
  shoulderPad: [0.074, 0.074, 0.074] as [number, number, number],
  elbowBridge: [0.064, 0.064, 0.064] as [number, number, number],
};

export const PELVIS = {
  y: 0.66,
  scale: { homme: [0.14, 0.12, 0.11], femme: [0.15, 0.12, 0.11] } as const,
};

export const SHOE = {
  soleW: 0.148,
  soleH: 0.04,
  soleD: 0.32,
};
