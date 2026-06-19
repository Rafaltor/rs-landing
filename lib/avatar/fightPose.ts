import type { AvatarBuildResult } from "./buildAvatar";
import { HEAD_BASE_Y, REST_POSE } from "./proportions";
import { applyRestPose } from "./restPose";

export const TURN_DUR = 0.3;
export const WAIT1_DUR = 0.3;
export const FLAP_DUR = 1.2;
export const WAIT2_DUR = 0.3;
export const LEAVE_DUR = 0.3;
export const BUMP_TOTAL =
  TURN_DUR + WAIT1_DUR + FLAP_DUR + WAIT2_DUR + LEAVE_DUR;

/** Nombre de battements bras pendant la phase FLAP. */
export const FLAP_CYCLES = 16;

const TURN_END = TURN_DUR;
const WAIT1_END = TURN_END + WAIT1_DUR;
const FLAP_END = WAIT1_END + FLAP_DUR;
const WAIT2_END = FLAP_END + WAIT2_DUR;

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function lerpAngle(from: number, to: number, t: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}

function easeInOut(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

function applyFlapArms(avatar: AvatarBuildResult, env: number, flap: number): void {
  for (const arm of avatar.parts.arms) {
    const side = arm.side > 0 ? 1 : -1;
    if (arm.shoulder) {
      arm.shoulder.rotation.x = -env * (0.9 + 0.5 * flap * side);
      arm.shoulder.rotation.y = 0;
      arm.shoulder.rotation.z = side * REST_POSE.shoulderZ;
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
      leg.hip.rotation.x = REST_POSE.hipX + brace * env;
      leg.hip.rotation.y = 0;
      leg.hip.rotation.z = 0;
    }
    if (leg.knee) {
      leg.knee.rotation.x =
        REST_POSE.kneeX + Math.max(0, brace * 0.35 * env);
      leg.knee.rotation.y = 0;
      leg.knee.rotation.z = 0;
    }
  }
}

/**
 * Séquence collision en 5 temps : TURN → WAIT1 → FLAP → WAIT2 → LEAVE.
 * @param bumpPhase temps restant normalisé (1 → 0) — à 0, applyWalkPose reprend la pose neutre.
 */
export function applyBumpPose(
  avatar: AvatarBuildResult,
  bumpPhase: number,
  facingY: number,
  leaveFacingY: number,
): void {
  const tSec = (1 - bumpPhase) * BUMP_TOTAL;
  let bodyY = 0;
  let bodyRotY = 0;
  let headRotY = 0;
  let bodyScale = 1;

  if (tSec < TURN_END) {
    const t01 = tSec / TURN_DUR;
    bodyRotY = lerpAngle(facingY, 0, easeInOut(t01));
    applyRestPose(avatar);
  } else if (tSec < WAIT1_END) {
    bodyRotY = 0;
    applyRestPose(avatar);
  } else if (tSec < FLAP_END) {
    const f = (tSec - WAIT1_END) / FLAP_DUR;
    const env = Math.sin(f * Math.PI);
    const flap = Math.sin(f * Math.PI * 2 * FLAP_CYCLES);
    bodyRotY = 0;
    bodyY = env * 0.016;
    bodyScale = 1 + env * 0.005;
    headRotY = env * 0.06;
    applyFlapArms(avatar, env, flap);
  } else if (tSec < WAIT2_END) {
    bodyRotY = 0;
    applyRestPose(avatar);
  } else {
    const l = (tSec - WAIT2_END) / LEAVE_DUR;
    bodyRotY = lerpAngle(0, leaveFacingY, easeInOut(l));
    headRotY = leaveFacingY * clamp01(l) * 0.06;
    applyRestPose(avatar);
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
