/**
 * Échelle fixe des Miis dans le salon 360°.
 * Attribuée au spawn (pas d’animation se rapprocher / s’éloigner).
 * 0 = plus petit, 1 = taille max (100 %).
 */

export const DEPTH_MIN = 0;
export const DEPTH_MAX = 1;

/** Facteur d’échelle CSS à « loin » (petit). */
export const DEPTH_SCALE_FAR = 0.45;
/** Facteur d’échelle CSS à « proche » — max 100 %. */
export const DEPTH_SCALE_NEAR = 1;

export function clampDepth(depth: number): number {
  return Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, depth));
}

/** Convertit 0–1 en échelle visuelle (max = 100 %). */
export function depthToScale(depth: number): number {
  const t = clampDepth(depth);
  const eased = t * t * (3 - 2 * t);
  return DEPTH_SCALE_FAR + (DEPTH_SCALE_NEAR - DEPTH_SCALE_FAR) * eased;
}

/** Empilement : les Miis plus grands passent devant. */
export function depthToZIndex(depth: number): number {
  return 30 + Math.round(clampDepth(depth) * 50);
}

/** Profondeur / échelle initiale stable (dérivée d’un seed). */
export function depthFromSeed(seed: number): number {
  return clampDepth(0.2 + ((seed % 9) / 8) * 0.8);
}
