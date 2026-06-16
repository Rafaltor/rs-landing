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

export function getAvatarHotspotElement(
  hotspotId: string,
): HTMLElement | undefined {
  return entries.get(hotspotId)?.element;
}

export function layoutRegisteredAvatarHotspots(viewer: PannellumViewer): void {
  for (const entry of entries.values()) {
    layoutPannellumHotspot(
      { pitch: entry.pitch, yaw: entry.yaw, scale: false },
      viewer,
      0,
      entry.element,
    );
  }
}

export function forcePannellumHotspotRepaint(viewer: PannellumViewer): void {
  const container = viewer.getContainer?.();
  if (!container) return;
  const layer = container.querySelector<HTMLElement>(".pnlm-render-container");
  if (!layer) return;
  layer.getBoundingClientRect();
  for (const entry of entries.values()) {
    entry.element.getBoundingClientRect();
  }
}

export function clearAvatarHotspotElements(): void {
  entries.clear();
}
