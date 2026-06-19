import type { AvatarBuildResult } from "./buildAvatar";
import { REST_POSE } from "./proportions";

/** Remet tous les pivots membres à la pose de repos (3 axes explicites). */
export function applyRestPose(avatar: AvatarBuildResult): void {
  for (const arm of avatar.parts.arms) {
    const side = arm.side > 0 ? 1 : -1;
    if (arm.shoulder) {
      arm.shoulder.rotation.x = 0;
      arm.shoulder.rotation.y = 0;
      arm.shoulder.rotation.z = side * REST_POSE.shoulderZ;
    }
    if (arm.elbow) {
      arm.elbow.rotation.x = REST_POSE.elbowX;
      arm.elbow.rotation.y = 0;
      arm.elbow.rotation.z = 0;
    }
  }

  for (const leg of avatar.parts.legs) {
    if (leg.hip) {
      leg.hip.rotation.x = REST_POSE.hipX;
      leg.hip.rotation.y = 0;
      leg.hip.rotation.z = 0;
    }
    if (leg.knee) {
      leg.knee.rotation.x = REST_POSE.kneeX;
      leg.knee.rotation.y = 0;
      leg.knee.rotation.z = 0;
    }
  }
}
