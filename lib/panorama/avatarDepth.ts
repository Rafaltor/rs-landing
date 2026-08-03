/**
 * Profondeur simulée des Miis dans le salon 360°.
 * 0 = loin (petit), 1 = proche (grand). Illusion de volume 3D.
 */

export const DEPTH_MIN = 0;
export const DEPTH_MAX = 1;

/** Facteur d’échelle CSS à profondeur 0 (loin). */
export const DEPTH_SCALE_FAR = 0.4;
/** Facteur d’échelle CSS à profondeur 1 (proche). */
export const DEPTH_SCALE_NEAR = 1.48;

export function clampDepth(depth: number): number {
  return Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, depth));
}

/** Convertit une profondeur 0–1 en échelle visuelle (perspective approximative). */
export function depthToScale(depth: number): number {
  const t = clampDepth(depth);
  // Courbe un peu plus « optique » : le gain de taille accélère en se rapprochant.
  const eased = t * t * (3 - 2 * t);
  return DEPTH_SCALE_FAR + (DEPTH_SCALE_NEAR - DEPTH_SCALE_FAR) * eased;
}

/** Empilement : les Miis proches passent devant. */
export function depthToZIndex(depth: number): number {
  return 30 + Math.round(clampDepth(depth) * 50);
}

export function randomDepth(): number {
  return 0.2 + Math.random() * 0.6;
}

/**
 * Amplitude max pour que depthBase ± amp reste dans [0, 1]
 * (évite le collage aux bornes).
 */
export function maxDepthAmpForBase(base: number, desiredAmp: number): number {
  const room = Math.min(base - DEPTH_MIN, DEPTH_MAX - base) - 0.02;
  return Math.max(0.05, Math.min(desiredAmp, room));
}
