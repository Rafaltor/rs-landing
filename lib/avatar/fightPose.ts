import type { AvatarBuildResult } from "./buildAvatar";
import { HEAD_BASE_Y } from "./proportions";

/** Nombre de battements bras pendant la réaction (~0,5 s). */
export const FLAP_CYCLES = 5;

/**
 * Réaction courte à la collision : profil fixe, moulinet rapide des bras en opposition.
 * @param bumpPhase temps restant (1 → 0) — à 0, applyWalkPose reprend la pose neutre.
 */
export function applyBumpPose(
  avatar: AvatarBuildResult,
  bumpPhase: number,
  facingY: number,
): void {
  const progress = 1 - bumpPhase;
  const env = Math.sin(progress * Math.PI);
  const flap = Math.sin(progress * Math.PI * 2 * FLAP_CYCLES);

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

  avatar.group.position.y = env * 0.016;
  avatar.group.rotation.x = 0;
  avatar.group.rotation.y = facingY;
  avatar.group.rotation.z = 0;
  avatar.parts.body.scale.y = 1 + env * 0.005;
  avatar.parts.head.position.y = HEAD_BASE_Y + env * 0.006;
  avatar.parts.head.rotation.x = 0;
  avatar.parts.head.rotation.y = facingY * env * 0.06;
  avatar.parts.head.rotation.z = 0;
}
