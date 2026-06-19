/** Profil Lathe du buste unisexe (rayon, hauteur Y) — veste courte à la taille. */
export const TORSO_PROFILE: [number, number][] = [
  [0.03, 0.92],
  [0.15, 0.95],
  [0.19, 1.05],
  [0.21, 1.18],
  [0.205, 1.3],
  [0.22, 1.42],
  [0.18, 1.52],
  [0.12, 1.58],
  [0.045, 1.62],
];

/** Bas de la veste (Y) — aligné sur le premier point du profil. */
export const TORSO_HEM_Y = TORSO_PROFILE[0][1];

/** Réglage largeur buste sans changer la hauteur (1 = profil brut). */
export const TORSO_WIDTH_SCALE = 0.86;

/** @deprecated Alias rétrocompat — profil unique. */
export const TORSO_PROFILES: Record<number, [number, number][]> = {
  0: TORSO_PROFILE,
};

/** Rayon du torse à une hauteur Y (révolution Lathe). */
export function torsoRadiusAt(y: number): number {
  const prof = TORSO_PROFILE;
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
export function chestZ(y: number, depth = 0.02): number {
  return torsoRadiusAt(y) + depth * 0.5 - 0.008;
}

/** Inclinaison poitrine (radians) pour coller au buste. */
export function chestTiltAt(y: number): number {
  const dy = 0.04;
  const r1 = torsoRadiusAt(y - dy);
  const r2 = torsoRadiusAt(y + dy);
  return Math.atan2(r2 - r1, dy * 2) - 0.28;
}
