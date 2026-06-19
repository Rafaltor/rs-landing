/** Profils Lathe du buste (rayon, hauteur Y) — veste courte à la taille. */
export const TORSO_PROFILES: Record<number, [number, number][]> = {
  0: [
    [0.03, 0.92],
    [0.16, 0.95],
    [0.205, 1.05],
    [0.225, 1.18],
    [0.22, 1.3],
    [0.235, 1.42],
    [0.2, 1.52],
    [0.13, 1.58],
    [0.045, 1.62],
  ],
  1: [
    [0.03, 0.92],
    [0.14, 0.95],
    [0.18, 1.05],
    [0.2, 1.18],
    [0.195, 1.3],
    [0.21, 1.42],
    [0.17, 1.52],
    [0.11, 1.58],
    [0.04, 1.62],
  ],
};

/** Réglage largeur buste sans changer la hauteur (1 = profil brut). */
export const TORSO_WIDTH_SCALE = 0.86;

/** Rayon du torse à une hauteur Y (révolution Lathe). */
export function torsoRadiusAt(bodyIdx: number, y: number): number {
  const prof = TORSO_PROFILES[bodyIdx] ?? TORSO_PROFILES[0];
  let r: number;
  if (y <= prof[0][1]) r = prof[0][0];
  else if (y >= prof[prof.length - 1][1]) r = prof[prof.length - 1][0];
  else {
    r = prof[prof.length - 1][0];
    for (let i = 0; i < prof.length - 1; i += 1) {
      const [r0, y0] = prof[i];
      const [r1, y1] = prof[i + 1];
      if (y >= y0 && y <= y1) {
        const t = (y - y0) / (y1 - y0 || 1);
        r = r0 + (r1 - r0) * t;
        break;
      }
    }
  }
  return r * TORSO_WIDTH_SCALE;
}

/**
 * Z du centre d'un élément plaqué sur la face avant du torse.
 * `depth` = épaisseur de la pièce selon Z.
 */
export function chestZ(bodyIdx: number, y: number, depth = 0.02): number {
  return torsoRadiusAt(bodyIdx, y) + depth * 0.5 - 0.008;
}

/** Inclinaison poitrine (radians) pour coller au buste. */
export function chestTiltAt(bodyIdx: number, y: number): number {
  const dy = 0.04;
  const r1 = torsoRadiusAt(bodyIdx, y - dy);
  const r2 = torsoRadiusAt(bodyIdx, y + dy);
  return Math.atan2(r2 - r1, dy * 2) - 0.28;
}
