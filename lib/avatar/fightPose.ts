import type { AvatarBuildResult } from "./buildAvatar";
import { HEAD_BASE_Y } from "./proportions";

/** Nombre de battements bras pendant la phase FLAP. */
export const FLAP_CYCLES = 5;

/** Fin de la phase TURN (fraction de progress 0→1). */
export const TURN_END = 0.3;

/** Fin de la phase FLAP (fraction de progress 0→1). */
export const FLAP_END = 0.75;

function lerpAngle(from: number, to: number, t: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}

function easeInOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function resetLimbRotations(avatar: AvatarBuildResult): void {
  for (const arm of avatar.parts.arms) {
    if (arm.shoulder) {
      arm.shoulder.rotation.x = 0;
      arm.shoulder.rotation.y = 0;
      arm.shoulder.rotation.z = 0;
    }
    if (arm.elbow) {
      arm.elbow.rotation.x = 0;
      arm.elbow.rotation.y = 0;
      arm.elbow.rotation.z = 0;
    }
  }
  for (const leg of avatar.parts.legs) {
    if (leg.hip) {
      leg.hip.rotation.x = 0;
      leg.hip.rotation.y = 0;
      leg.hip.rotation.z = 0;
    }
    if (leg.knee) {
      leg.knee.rotation.x = 0;
      leg.knee.rotation.y = 0;
      leg.knee.rotation.z = 0;
    }
  }
}

function applyFlapArms(avatar: AvatarBuildResult, env: number, flap: number): void {
  for (const arm of avatar.parts.arms) {
    const side = arm.side > 0 ? 1 : -1;
    if (arm.shoulder) {
      arm.shoulder.rotation.x = -env * (0.9 + 0.5 * flap * side);
      arm.shoulder.rotation.z = side * env * 0.12;
      arm.shoulder.rotation.y = 0;
    }
    if (arm.elbow) {
      arm.elbow.rotation.x = -env * (0.2 + Math.abs(flap) * 0.4);
      arm.elbow.rotation.y = 0;
      arm.elbow.rotation.z = 0;
    }
  }

  for (const leg of avatar.parts.legs) {
    const brace = leg.side > 0 ? 0.1 : 0.18;
    if (leg.hip) {
      leg.hip.rotation.x = brace * env;
      leg.hip.rotation.y = 0;
      leg.hip.rotation.z = 0;
    }
    if (leg.knee) {
      leg.knee.rotation.x = Math.max(0, brace * 0.35 * env);
      leg.knee.rotation.y = 0;
      leg.knee.rotation.z = 0;
    }
  }
}

/**
 * Séquence collision en 3 temps : TURN → FLAP → LEAVE.
 * @param bumpPhase temps restant (1 → 0) — à 0, applyWalkPose reprend la pose neutre.
 */
export function applyBumpPose(
  avatar: AvatarBuildResult,
  bumpPhase: number,
  facingY: number,
  leaveFacingY: number,
): void {
  const progress = 1 - bumpPhase;
  let bodyY = 0;
  let bodyRotY = 0;
  let headRotY = 0;
  let bodyScale = 1;

  if (progress < TURN_END) {
    const t = easeInOut(progress / TURN_END);
    bodyRotY = lerpAngle(facingY, 0, t);
    resetLimbRotations(avatar);
  } else if (progress < FLAP_END) {
    const f = (progress - TURN_END) / (FLAP_END - TURN_END);
    const env = Math.sin(f * Math.PI);
    const flap = Math.sin(f * Math.PI * 2 * FLAP_CYCLES);
    bodyRotY = 0;
    bodyY = env * 0.016;
    bodyScale = 1 + env * 0.005;
    headRotY = env * 0.06;
    applyFlapArms(avatar, env, flap);
  } else {
    const l = easeInOut((progress - FLAP_END) / (1 - FLAP_END));
    bodyRotY = lerpAngle(0, leaveFacingY, l);
    headRotY = leaveFacingY * l * 0.06;
    resetLimbRotations(avatar);
  }

  avatar.group.position.y = bodyY;
  avatar.group.rotation.x = 0;
  avatar.group.rotation.y = bodyRotY;
  avatar.group.rotation.z = 0;
  avatar.parts.body.scale.y = bodyScale;
  avatar.parts.head.position.y = HEAD_BASE_Y + bodyY * 0.4;
  avatar.parts.head.rotation.x = 0;
  avatar.parts.head.rotation.y = headRotY;
  avatar.parts.head.rotation.z = 0;
}
