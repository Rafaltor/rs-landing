/**
 * Limites verticales (pitch Pannellum, degrés) pour spawn + promenade des Miis.
 * Pitch négatif = vers le bas, positif = vers le haut.
 */
export const AVATAR_PITCH_MIN = -45;
export const AVATAR_PITCH_MAX = 32;

export function clampAvatarPitch(pitch: number): number {
  return Math.max(AVATAR_PITCH_MIN, Math.min(AVATAR_PITCH_MAX, pitch));
}

export function randomAvatarPitch(): number {
  return (
    AVATAR_PITCH_MIN +
    Math.random() * (AVATAR_PITCH_MAX - AVATAR_PITCH_MIN)
  );
}

/**
 * Amplitude max pour que base ± amp reste dans les bornes (évite le
 * « collage » en haut/bas quand le clamp coupe le sinus).
 */
export function maxPitchAmpForBase(basePitch: number, desiredAmp: number): number {
  const room =
    Math.min(basePitch - AVATAR_PITCH_MIN, AVATAR_PITCH_MAX - basePitch) - 0.5;
  return Math.max(2, Math.min(desiredAmp, room));
}
