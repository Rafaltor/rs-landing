import type { AvatarBuildResult } from "./buildAvatar";
import { HEAD_BASE_Y, REST_POSE } from "./proportions";

/** Amplitude balancement cuisse (radians). */
export const LEG_SWING = 0.4;

/** Amplitude flexion genou (radians). */
export const KNEE_BEND = 0.46;

/** Amplitude balancement bras (radians). */
export const ARM_SWING = 0.28;

/** Amplitude flexion coude en marche (radians). */
export const ELBOW_SWING = 0.18;

export type WalkPoseOptions = {
  speed?: number;
  /** Orientation du corps (radians). */
  headingY?: number;
  /** Inclinaison latérale gauche / droite. */
  turnLean?: number;
};

/** Pose de marche procédurale (jambes + bras + balancement). */
export function applyWalkPose(
  avatar: AvatarBuildResult,
  elapsed: number,
  options?: WalkPoseOptions | number,
): void {
  const resolved: WalkPoseOptions =
    typeof options === "number" ? { speed: options } : (options ?? {});
  const speed = resolved.speed ?? 3.6;
  const headingY = resolved.headingY ?? 0;
  const turnLean = resolved.turnLean ?? 0;
  const t = elapsed * speed;

  for (const leg of avatar.parts.legs) {
    const phase = t + (leg.side < 0 ? 0 : Math.PI);
    if (leg.hip) {
      leg.hip.rotation.x = REST_POSE.hipX + Math.sin(phase) * LEG_SWING;
      leg.hip.rotation.y = 0;
      leg.hip.rotation.z = 0;
    }
    if (leg.knee) {
      leg.knee.rotation.x =
        REST_POSE.kneeX + Math.max(0, -Math.cos(phase)) * KNEE_BEND;
      leg.knee.rotation.y = 0;
      leg.knee.rotation.z = 0;
    }
  }

  for (const arm of avatar.parts.arms) {
    const phase = t + (arm.side > 0 ? 0 : Math.PI);
    const side = arm.side > 0 ? 1 : -1;
    if (arm.shoulder) {
      arm.shoulder.rotation.x = Math.sin(phase) * ARM_SWING;
      arm.shoulder.rotation.y = 0;
      arm.shoulder.rotation.z = side * REST_POSE.shoulderZ;
    }
    if (arm.elbow) {
      arm.elbow.rotation.x =
        REST_POSE.elbowX + Math.max(0, Math.sin(phase)) * ELBOW_SWING;
      arm.elbow.rotation.y = 0;
      arm.elbow.rotation.z = 0;
    }
  }

  const bob = Math.abs(Math.sin(t * 2));
  avatar.group.position.y = bob * 0.024;
  avatar.group.rotation.x = 0;
  avatar.group.rotation.y = headingY;
  avatar.group.rotation.z = turnLean;
  avatar.parts.body.scale.y = 1 + bob * 0.008;
  avatar.parts.head.position.y = HEAD_BASE_Y + bob * 0.012;
  avatar.parts.head.rotation.x = 0;
  avatar.parts.head.rotation.y =
    Math.sin(t * 0.6) * 0.03 - turnLean * 0.45 + headingY * 0.08;
  avatar.parts.head.rotation.z = turnLean * 0.25;
}
