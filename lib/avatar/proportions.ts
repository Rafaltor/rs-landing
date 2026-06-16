/** Silhouette fine et élancée — repères partagés (hauteur conservée). */
export const HEAD_BASE_Y = 2.06;
export const HEAD_SKULL: [number, number, number] = [0.38, 0.5, 0.36];
export const HEAD_EAR_X = 0.355;
export const HEAD_EAR_SCALE: [number, number, number] = [0.05, 0.072, 0.056];
export const HAIR_CAP_R = 0.395;

export const NECK = { radius: 0.062, length: 0.14, y: 1.74 };

export const LIMBS = {
  thighLen: 0.148,
  thighR: 0.052,
  calfLen: 0.136,
  calfR: 0.045,
  upLen: 0.268,
  upR: 0.052,
  foreLen: 0.238,
  foreR: 0.044,
  hipY: 0.655,
  legSep: { homme: 0.082, femme: 0.09 } as const,
  hipBridge: [0.078, 0.075, 0.07] as [number, number, number],
  kneeBridge: [0.068, 0.065, 0.062] as [number, number, number],
  shoulderPad: [0.068, 0.068, 0.06] as [number, number, number],
  elbowBridge: [0.064, 0.062, 0.058] as [number, number, number],
};

export const PELVIS = {
  y: 0.638,
  scale: { homme: [0.175, 0.14, 0.125], femme: [0.188, 0.14, 0.125] } as const,
};

export const SHOE = {
  soleW: 0.148,
  soleH: 0.04,
  soleD: 0.32,
};
