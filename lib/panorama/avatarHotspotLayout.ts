/**
 * Les pitch stockés en BDD ciblent le sol du salon (ancrage pieds).
 * Le hotspot HTML est centré : on remonte le point sphérique à l’affichage.
 */
export const AVATAR_HOTSPOT_PITCH_OFFSET = 10;

export function layoutPitchForAvatarHotspot(storedPitch: number): number {
  return storedPitch + AVATAR_HOTSPOT_PITCH_OFFSET;
}
