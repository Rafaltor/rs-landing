import { layoutPitchForAvatarHotspot } from "@/lib/panorama/avatarHotspotLayout";
import { layoutPannellumHotspot } from "@/lib/panorama/layoutPannellumHotspot";

type AvatarHotspotEntry = {
  element: HTMLElement;
  pitch: number;
  yaw: number;
};

const entries = new Map<string, AvatarHotspotEntry>();

export function registerAvatarHotspotElement(
  hotspotId: string,
  element: HTMLElement,
  pitch: number,
  yaw: number,
): void {
  element.dataset.rsAvatarHotspot = hotspotId;
  entries.set(hotspotId, { element, pitch, yaw });
}

export function updateAvatarHotspotAngles(
  hotspotId: string,
  pitch: number,
  yaw: number,
): void {
  const entry = entries.get(hotspotId);
  if (!entry) return;
  entry.pitch = pitch;
  entry.yaw = yaw;
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
    );
  }
}

export function clearAvatarHotspotElements(): void {
  entries.clear();
}
