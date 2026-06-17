import type { AvatarBuildResult } from "./buildAvatar";
import { HEAD_BASE_Y } from "./proportions";

/**
 * Réaction courte à la collision : profil fixe, bras qui bougent, puis retour marche.
 * @param bumpPhase temps restant (1 → 0)
 * @param facingY rotation Y (profil vers l'autre Mii)
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
      arm.shoulder.rotation.x = -0.25 - k * 0.95;
      arm.shoulder.rotation.z = push * (0.18 + k * 0.62);
      arm.shoulder.rotation.y = push * k * 0.12;
    }
    if (arm.elbow) {
      arm.elbow.rotation.x = -0.1 - k * 0.75;
    }
  }

  for (const leg of avatar.parts.legs) {
    const brace = leg.side > 0 ? 0.12 : 0.22;
    if (leg.hip) leg.hip.rotation.x = brace * k;
    if (leg.knee) leg.knee.rotation.x = Math.max(0, brace * 0.4 * k);
  }

  avatar.group.position.y = k * 0.018;
  avatar.group.rotation.x = 0;
  avatar.group.rotation.y = facingY;
  avatar.group.rotation.z = pushLean(progress, facingY) * k * 0.06;
  avatar.parts.body.scale.y = 1 + k * 0.006;
  avatar.parts.head.position.y = HEAD_BASE_Y + k * 0.008;
  avatar.parts.head.rotation.y = facingY * 0.08;
  avatar.parts.head.rotation.z = 0;
}

function pushLean(progress: number, facingY: number): number {
  return Math.sin(progress * Math.PI * 2 + facingY) > 0 ? 1 : -1;
}
