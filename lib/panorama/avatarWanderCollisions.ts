import {
  isAvatarBumping,
  triggerAvatarBumpForHotspot,
} from "@/lib/avatar/avatarWalkHeading";

/** Distance angulaire (degrés) pour déclencher une collision. */
export const COLLISION_DIST_DEG = 11;

/** Écartement immédiat le long de la normale (degrés). */
export const SEPARATION_PUSH_DEG = 2.6;

/** Délai avant une nouvelle collision entre les mêmes Mii (secondes). */
export const COOLDOWN_SEC = 0.8;

export type WanderWalker = {
  hotspotId: string;
  /** Position courante intégrée (degrés). */
  yaw: number;
  pitch: number;
  /** Centre de l'oscillation verticale (degrés). */
  basePitch: number;
  /** Vitesse de marche horizontale (degrés / seconde). */
  dir: number;
  /** Phase de l'oscillation pitch (radians, bornée). */
  phase: number;
  /** Vitesse de la phase pitch (rad / s). */
  phaseRate: number;
  /** Amplitude pitch (degrés). */
  pitchAmp: number;
  prevYaw: number;
  prevPitch: number;
  /** Secondes restantes avant nouvelle collision. */
  collisionCooldown: number;
};

function facingToward(dy: number, dp: number): number {
  return Math.atan2(dy, dp * 0.42 + 0.06);
}

/**
 * Détection sur positions courantes, réaction bras, séparation, demi-tour via `dir`.
 */
export function resolveAvatarCollisions(
  walkers: WanderWalker[],
  normalizeYawDelta: (delta: number) => number,
): void {
  if (walkers.length < 2) return;

  for (let i = 0; i < walkers.length; i++) {
    for (let j = i + 1; j < walkers.length; j++) {
      const a = walkers[i];
      const b = walkers[j];

      if (
        a.collisionCooldown > 0 ||
        b.collisionCooldown > 0 ||
        isAvatarBumping(a.hotspotId) ||
        isAvatarBumping(b.hotspotId)
      ) {
        continue;
      }

      const dy = normalizeYawDelta(b.yaw - a.yaw);
      const dp = b.pitch - a.pitch;
      const dist = Math.hypot(dp, dy * 0.9);

      if (dist >= COLLISION_DIST_DEG) continue;

      const inv = dist > 0.001 ? 1 / dist : 1;
      const nx = dy * inv;
      const ny = dp * inv;
      const push =
        SEPARATION_PUSH_DEG * (1 - dist / COLLISION_DIST_DEG) + 0.8;

      a.yaw -= nx * push;
      a.pitch -= ny * push;
      b.yaw += nx * push;
      b.pitch += ny * push;

      a.dir *= -1;
      b.dir *= -1;

      a.collisionCooldown = COOLDOWN_SEC;
      b.collisionCooldown = COOLDOWN_SEC;

      triggerAvatarBumpForHotspot(a.hotspotId, facingToward(dy, dp));
      triggerAvatarBumpForHotspot(b.hotspotId, facingToward(-dy, -dp));
    }
  }
}
