import type { AvatarBuildResult } from "./buildAvatar";
import { HEAD_BASE_Y } from "./proportions";

export type WalkPoseOptions = {
  speed?: number;
  /** Orientation du corps (radians). */
  headingY?: number;
  /** Inclinaison dans les virages. */
  turnLean?: number;
  /** Inclinaison avant/arrière (montée / descente). */
  pitchLean?: number;
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
  const pitchLean = resolved.pitchLean ?? 0;
  const t = elapsed * speed;

  for (const leg of avatar.parts.legs) {
    const phase = t + (leg.side < 0 ? 0 : Math.PI);
    if (leg.hip) leg.hip.rotation.x = Math.sin(phase) * 0.44;
    if (leg.knee) leg.knee.rotation.x = Math.max(0, -Math.cos(phase)) * 0.5;
  }

  for (const arm of avatar.parts.arms) {
    const phase = t + (arm.side > 0 ? 0 : Math.PI);
    if (arm.shoulder) arm.shoulder.rotation.x = Math.sin(phase) * 0.3;
    if (arm.elbow) arm.elbow.rotation.x = 0.07 + Math.max(0, Math.sin(phase)) * 0.2;
  }

  const bob = Math.abs(Math.sin(t * 2));
  avatar.group.position.y = bob * 0.024;
  avatar.group.rotation.x = pitchLean;
  avatar.group.rotation.y = headingY;
  avatar.group.rotation.z = turnLean;
  avatar.parts.body.scale.y = 1 + bob * 0.008;
  avatar.parts.head.position.y = HEAD_BASE_Y + bob * 0.012;
  avatar.parts.head.rotation.y =
    Math.sin(t * 0.6) * 0.03 - turnLean * 0.45 + headingY * 0.08;
}
