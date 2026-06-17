import type { AvatarBuildResult } from "./buildAvatar";
import { HEAD_BASE_Y } from "./proportions";

/** Pose de bagarre procédurale (coups de poing alternés). */
export function applyFightPose(
  avatar: AvatarBuildResult,
  elapsed: number,
  fightPhase: number,
  seed: number,
): void {
  const intensity = Math.min(1, fightPhase / 0.35);
  const fade = fightPhase < 0.25 ? fightPhase / 0.25 : 1;
  const k = intensity * fade;
  const t = elapsed * 9 + seed;

  const punchSide = Math.sin(t * 4.2) > 0 ? 1 : -1;
  const windup = (Math.sin(t * 4.2) + 1) * 0.5;

  for (const arm of avatar.parts.arms) {
    const punching = arm.side === punchSide;
    if (arm.shoulder) {
      if (punching) {
        arm.shoulder.rotation.x = -0.35 - windup * 1.35 * k;
        arm.shoulder.rotation.z = arm.side * (-0.22 - windup * 0.35) * k;
        arm.shoulder.rotation.y = arm.side * 0.18 * k;
      } else {
        arm.shoulder.rotation.x = -0.55 * k;
        arm.shoulder.rotation.z = arm.side * 0.42 * k;
        arm.shoulder.rotation.y = 0;
      }
    }
    if (arm.elbow) {
      arm.elbow.rotation.x = punching
        ? -0.25 - windup * 1.05 * k
        : 0.35 * k;
    }
  }

  for (const leg of avatar.parts.legs) {
    const stagger = leg.side === punchSide ? 0.28 : 0.08;
    if (leg.hip) leg.hip.rotation.x = stagger * k;
    if (leg.knee) leg.knee.rotation.x = Math.max(0, stagger * 0.55 * k);
  }

  const sway = Math.sin(t * 8) * 0.11 * k;
  avatar.group.position.y = Math.abs(Math.sin(t * 6.5)) * 0.035 * k;
  avatar.group.rotation.y = sway * 0.35;
  avatar.group.rotation.z = sway;
  avatar.parts.body.scale.y = 1 + Math.sin(t * 10) * 0.012 * k;
  avatar.parts.head.position.y = HEAD_BASE_Y + Math.sin(t * 7) * 0.018 * k;
  avatar.parts.head.rotation.y = punchSide * 0.22 * k;
  avatar.parts.head.rotation.z = sway * 0.5;
}
