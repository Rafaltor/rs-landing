import {
  BUMP_DURATION,
  triggerAvatarBumpForHotspot,
} from "@/lib/avatar/avatarWalkHeading";
import { clampAvatarPitch, maxPitchAmpForBase } from "@/lib/panorama/avatarPitchBounds";

/** Distance angulaire (degrés) pour déclencher une collision. */
export const COLLISION_DIST_DEG = 8.5;

/** Écartement immédiat le long de la normale (degrés). */
export const SEPARATION_PUSH_DEG = 3.4;

/** Invincibilité après la séquence de bump (secondes). */
export const COLLISION_INVINCIBILITY_SEC = 2 / 3;

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
};

const pairCooldowns = new Map<string, number>();

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function wrapWanderYaw(yaw: number): number {
  let y = yaw % 360;
  if (y > 180) y -= 360;
  if (y < -180) y += 360;
  return y;
}

export function decayCollisionPairCooldowns(dt: number): void {
  for (const [key, remaining] of pairCooldowns) {
    const next = remaining - dt;
    if (next <= 0) pairCooldowns.delete(key);
    else pairCooldowns.set(key, next);
  }
}

export function clearCollisionPairCooldowns(): void {
  pairCooldowns.clear();
}

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
      const key = pairKey(a.hotspotId, b.hotspotId);

      if ((pairCooldowns.get(key) ?? 0) > 0) {
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

      a.yaw = wrapWanderYaw(a.yaw - nx * push);
      a.pitch = clampAvatarPitch(a.pitch - ny * push);
      a.basePitch = a.pitch;
      a.pitchAmp = maxPitchAmpForBase(a.basePitch, a.pitchAmp);
      b.yaw = wrapWanderYaw(b.yaw + nx * push);
      b.pitch = clampAvatarPitch(b.pitch + ny * push);
      b.basePitch = b.pitch;
      b.pitchAmp = maxPitchAmpForBase(b.basePitch, b.pitchAmp);

      a.dir *= -1;
      b.dir *= -1;

      pairCooldowns.set(key, BUMP_DURATION + COLLISION_INVINCIBILITY_SEC);

      triggerAvatarBumpForHotspot(
        a.hotspotId,
        facingToward(dy, dp),
        facingToward(-dy, -dp),
      );
      triggerAvatarBumpForHotspot(
        b.hotspotId,
        facingToward(-dy, -dp),
        facingToward(dy, dp),
      );
    }
  }
}
