import { triggerAvatarFightForHotspot } from "@/lib/avatar/avatarWalkHeading";

export type WanderWalker = {
  hotspotId: string;
  basePitch: number;
  baseYaw: number;
  phase: number;
  yawRate: number;
  pitchAmp: number;
  yawAmp: number;
  prevPitch: number;
  prevYaw: number;
  collisionCooldown: number;
};

const COLLISION_DIST_DEG = 11;
const SEPARATION_PUSH = 3.4;
const COOLDOWN_FRAMES = 110;

type SamplePosition = (walker: WanderWalker) => { pitch: number; yaw: number };

/** Détection + répulsion + déclenchement bagarre entre Mii proches. */
export function resolveAvatarCollisions(
  walkers: WanderWalker[],
  samplePosition: SamplePosition,
  normalizeYawDelta: (delta: number) => number,
): void {
  for (const w of walkers) {
    if (w.collisionCooldown > 0) w.collisionCooldown -= 1;
  }

  if (walkers.length < 2) return;

  for (let i = 0; i < walkers.length; i++) {
    for (let j = i + 1; j < walkers.length; j++) {
      const a = walkers[i];
      const b = walkers[j];
      if (a.collisionCooldown > 0 && b.collisionCooldown > 0) continue;

      const posA = samplePosition(a);
      const posB = samplePosition(b);
      const dy = normalizeYawDelta(posB.yaw - posA.yaw);
      const dp = posB.pitch - posA.pitch;
      const dist = Math.hypot(dp, dy * 0.9);

      if (dist >= COLLISION_DIST_DEG) continue;

      const inv = dist > 0.001 ? 1 / dist : 1;
      const nx = dy * inv;
      const ny = dp * inv;
      const push = SEPARATION_PUSH * (1 - dist / COLLISION_DIST_DEG);

      a.baseYaw -= nx * push;
      a.basePitch -= ny * push;
      b.baseYaw += nx * push;
      b.basePitch += ny * push;

      a.yawRate *= -1;
      b.yawRate *= -1;
      a.phase += 0.35;
      b.phase += 0.35;

      a.collisionCooldown = COOLDOWN_FRAMES;
      b.collisionCooldown = COOLDOWN_FRAMES;

      triggerAvatarFightForHotspot(a.hotspotId);
      triggerAvatarFightForHotspot(b.hotspotId);
    }
  }
}
