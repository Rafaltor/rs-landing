/**
 * Limites verticales (pitch Pannellum, degrés) pour spawn + promenade des Miis.
 * Pitch négatif = vers le bas, positif = vers le haut.
 * Large bande pour éviter qu’ils s’entassent au milieu de l’écran.
 */
export const AVATAR_PITCH_MIN = -28;
export const AVATAR_PITCH_MAX = 16;

export function clampAvatarPitch(pitch: number): number {
  return Math.max(AVATAR_PITCH_MIN, Math.min(AVATAR_PITCH_MAX, pitch));
}

export function randomAvatarPitch(): number {
  return (
    AVATAR_PITCH_MIN +
    Math.random() * (AVATAR_PITCH_MAX - AVATAR_PITCH_MIN)
  );
}
