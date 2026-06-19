import type { AvatarBuildResult } from "./buildAvatar";
import { HEAD_BASE_Y } from "./proportions";

/**
 * Réaction courte à la collision : profil fixe, bras qui bougent.
 * @param bumpPhase temps restant (1 → 0) — à 0, applyWalkPose reprend la pose neutre.
 */
export function applyBumpPose(
  avatar: AvatarBuildResult,
  bumpPhase: number,
  facingY: number,
): void {
  const progress = 1 - bumpPhase;
  const k = Math.sin(progress * Math.PI);

  for (const arm of avatar.parts.arms) {
    const push = arm.side > 0 ? 1 : -1;
    if (arm.shoulder) {
      arm.shoulder.rotation.x = -0.2 - k * 0.85;
      arm.shoulder.rotation.z = push * (0.15 + k * 0.55);
      arm.shoulder.rotation.y = push * k * 0.1;
    }
    if (arm.elbow) {
      arm.elbow.rotation.x = -0.08 - k * 0.65;
      arm.elbow.rotation.y = 0;
      arm.elbow.rotation.z = 0;
    }
  }

  for (const leg of avatar.parts.legs) {
    const brace = leg.side > 0 ? 0.1 : 0.18;
    if (leg.hip) {
      leg.hip.rotation.x = brace * k;
      leg.hip.rotation.y = 0;
      leg.hip.rotation.z = 0;
    }
    if (leg.knee) {
      leg.knee.rotation.x = Math.max(0, brace * 0.35 * k);
      leg.knee.rotation.y = 0;
      leg.knee.rotation.z = 0;
    }
  }

  avatar.group.position.y = k * 0.016;
  avatar.group.rotation.x = 0;
  avatar.group.rotation.y = facingY;
  avatar.group.rotation.z = 0;
  avatar.parts.body.scale.y = 1 + k * 0.005;
  avatar.parts.head.position.y = HEAD_BASE_Y + k * 0.006;
  avatar.parts.head.rotation.x = 0;
  avatar.parts.head.rotation.y = facingY * 0.06;
  avatar.parts.head.rotation.z = 0;
}
