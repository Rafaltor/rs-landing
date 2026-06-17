export type AvatarWalkMotion = {
  /** Rotation Y du corps (radians), alignée sur la direction de déplacement. */
  headingY: number;
  /** Inclinaison latérale dans les virages. */
  turnLean: number;
  /** Inclinaison avant/arrière quand le Mii monte ou descend dans le panorama. */
  pitchLean: number;
  /** Multiplicateur vitesse d'animation de marche. */
  speed: number;
};

const motions = new Map<string, AvatarWalkMotion>();

const DEFAULT_MOTION: AvatarWalkMotion = {
  headingY: 0,
  turnLean: 0,
  pitchLean: 0,
  speed: 3.6,
};

function lerpAngle(from: number, to: number, t: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}

function placementIdFromHotspotId(hotspotId: string): string | null {
  const prefix = "rs-avatar-";
  if (!hotspotId.startsWith(prefix)) return null;
  return hotspotId.slice(prefix.length);
}

/** Met à jour l'orientation à partir du déplacement dans le panorama (degrés / frame). */
export function updateAvatarWalkMotion(
  placementId: string,
  deltaYaw: number,
  deltaPitch: number,
): void {
  const prev = motions.get(placementId) ?? DEFAULT_MOTION;
  const move = Math.hypot(deltaYaw, deltaPitch);

  let targetHeading = prev.headingY;
  if (move > 0.012) {
    targetHeading = Math.atan2(deltaYaw, deltaPitch * 0.42 + 0.06);
    targetHeading = Math.max(-Math.PI * 0.92, Math.min(Math.PI * 0.92, targetHeading));
  }

  const headingY = lerpAngle(prev.headingY, targetHeading, 0.2);
  const turnLean = lerpAngle(prev.turnLean, deltaYaw * 0.022, 0.25);
  const targetPitchLean = Math.max(
    -0.48,
    Math.min(0.48, -deltaPitch * 0.062),
  );
  const pitchLean = lerpAngle(prev.pitchLean, targetPitchLean, 0.2);
  const speed = 3.6 * Math.min(2.1, Math.max(0.45, move / 0.09));

  motions.set(placementId, { headingY, turnLean, pitchLean, speed });
}

export function updateAvatarWalkMotionForHotspot(
  hotspotId: string,
  deltaYaw: number,
  deltaPitch: number,
): void {
  const placementId = placementIdFromHotspotId(hotspotId);
  if (!placementId) return;
  updateAvatarWalkMotion(placementId, deltaYaw, deltaPitch);
}

export function getAvatarWalkMotion(placementId: string): AvatarWalkMotion {
  return motions.get(placementId) ?? DEFAULT_MOTION;
}

export function clearAvatarWalkMotions(): void {
  motions.clear();
}
