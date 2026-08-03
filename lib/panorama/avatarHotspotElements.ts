import { layoutPitchForAvatarHotspot } from "@/lib/panorama/avatarHotspotLayout";
import { depthToScale, depthToZIndex } from "@/lib/panorama/avatarDepth";
import { layoutPannellumHotspot } from "@/lib/panorama/layoutPannellumHotspot";

type AvatarHotspotEntry = {
  element: HTMLElement;
  pitch: number;
  yaw: number;
  /** 0 = loin, 1 = proche. */
  depth: number;
};

const entries = new Map<string, AvatarHotspotEntry>();

export function registerAvatarHotspotElement(
  hotspotId: string,
  element: HTMLElement,
  pitch: number,
  yaw: number,
  depth = 0.55,
): void {
  element.dataset.rsAvatarHotspot = hotspotId;
  entries.set(hotspotId, { element, pitch, yaw, depth });
}

export function updateAvatarHotspotAngles(
  hotspotId: string,
  pitch: number,
  yaw: number,
  depth?: number,
): void {
  const entry = entries.get(hotspotId);
  if (!entry) return;
  entry.pitch = pitch;
  entry.yaw = yaw;
  if (depth !== undefined) entry.depth = depth;
}

export function layoutRegisteredAvatarHotspots(viewer: PannellumViewer): void {
  for (const entry of entries.values()) {
    layoutPannellumHotspot(
      {
        pitch: layoutPitchForAvatarHotspot(entry.pitch),
        yaw: entry.yaw,
        scale: false,
      },
      viewer,
      0,
      entry.element,
      depthToScale(entry.depth),
    );
    if (entry.element.style.visibility !== "hidden") {
      entry.element.style.zIndex = String(depthToZIndex(entry.depth));
    }
  }
}

export function clearAvatarHotspotElements(): void {
  entries.clear();
}
