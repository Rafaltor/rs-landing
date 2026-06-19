import { BUMP_TOTAL } from "./fightPose";

/** Durée totale de la séquence collision (secondes) — alignée sur fightPose.BUMP_TOTAL. */
export const BUMP_DURATION = BUMP_TOTAL;

export type AvatarWalkMotion = {
  headingY: number;
  turnLean: number;
  speed: number;
  /** Temps restant de la réaction collision (1 → 0). */
  bumpPhase: number;
  /** Profil face à l'autre Mii au début de la séquence. */
  bumpFacingY: number;
  /** Orientation de départ après la chamaillerie (sens opposé à l'arrivée). */
  bumpLeaveFacingY: number;
};

const motions = new Map<string, AvatarWalkMotion>();

const DEFAULT_MOTION: AvatarWalkMotion = {
  headingY: 0,
  turnLean: 0,
  speed: 3.6,
  bumpPhase: 0,
  bumpFacingY: 0,
  bumpLeaveFacingY: 0,
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

export function isAvatarBumping(hotspotId: string): boolean {
  const placementId = placementIdFromHotspotId(hotspotId);
  if (!placementId) return false;
  return (motions.get(placementId)?.bumpPhase ?? 0) > 0.02;
}

export function updateAvatarWalkMotion(
  placementId: string,
  deltaYaw: number,
  deltaPitch: number,
): void {
  const prev = motions.get(placementId) ?? DEFAULT_MOTION;
  if (prev.bumpPhase > 0.02) return;

  const move = Math.hypot(deltaYaw, deltaPitch);

  let targetHeading = prev.headingY;
  if (move > 0.012) {
    targetHeading = Math.atan2(deltaYaw, deltaPitch * 0.42 + 0.06);
    targetHeading = Math.max(-Math.PI * 0.92, Math.min(Math.PI * 0.92, targetHeading));
  }

  const headingY = lerpAngle(prev.headingY, targetHeading, 0.2);
  const targetLean = Math.max(-0.38, Math.min(0.38, deltaYaw * 0.052));
  const turnLean = lerpAngle(prev.turnLean, targetLean, 0.28);
  const speed = 3.6 * Math.min(2.1, Math.max(0.45, move / 0.09));

  motions.set(placementId, {
    ...prev,
    headingY,
    turnLean,
    speed,
  });
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

export function triggerAvatarBump(
  placementId: string,
  facingY: number,
  leaveFacingY: number,
): void {
  const prev = motions.get(placementId) ?? DEFAULT_MOTION;
  if (prev.bumpPhase > 0.02) return;

  motions.set(placementId, {
    ...prev,
    bumpPhase: 1,
    bumpFacingY: facingY,
    bumpLeaveFacingY: leaveFacingY,
    headingY: facingY,
    turnLean: 0,
    speed: 2.2,
  });
}

export function triggerAvatarBumpForHotspot(
  hotspotId: string,
  facingY: number,
  leaveFacingY: number,
): void {
  const placementId = placementIdFromHotspotId(hotspotId);
  if (!placementId) return;
  triggerAvatarBump(placementId, facingY, leaveFacingY);
}

export function decayAvatarBumpState(placementId: string, delta: number): void {
  const motion = motions.get(placementId);
  if (!motion || motion.bumpPhase <= 0) return;
  motion.bumpPhase = Math.max(0, motion.bumpPhase - delta / BUMP_DURATION);
  if (motion.bumpPhase < 0.001) {
    motion.bumpPhase = 0;
    motion.headingY = motion.bumpLeaveFacingY;
    return;
  }
  if (motion.bumpPhase === 0) {
    motion.headingY = motion.bumpLeaveFacingY;
  }
}

export function decayAvatarBumpForHotspot(
  hotspotId: string,
  delta: number,
): void {
  const placementId = placementIdFromHotspotId(hotspotId);
  if (!placementId) return;
  decayAvatarBumpState(placementId, delta);
}

export function getAvatarWalkMotion(placementId: string): AvatarWalkMotion {
  return motions.get(placementId) ?? DEFAULT_MOTION;
}

export function clearAvatarWalkMotions(): void {
  motions.clear();
}
