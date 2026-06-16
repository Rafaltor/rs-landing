import {
  createAvatarScreen,
  type AvatarScreenHotspotArgs,
} from "@/lib/avatar/avatarScreenHotspot";
import {
  getAvatarPlacements,
  hotspotIdForPlacement,
  type AvatarPlacement,
} from "@/lib/avatar/avatarPlacements";
import { clearAvatarHotspotElements } from "@/lib/panorama/avatarHotspotElements";
import { layoutPitchForAvatarHotspot } from "@/lib/panorama/avatarHotspotLayout";
import { layoutPannellumHotspot } from "@/lib/panorama/layoutPannellumHotspot";

const SCENE_ID = "salon";

const registeredHotspotIds = new Set<string>();
const runtimeHotspots = new Map<string, PannellumHotSpot & { id: string }>();

function buildHotSpot(
  placement: AvatarPlacement,
): PannellumHotSpot & { id: string } {
  const args: AvatarScreenHotspotArgs = {
    id: placement.id,
    wander: true,
  };

  return {
    id: hotspotIdForPlacement(placement.id),
    pitch: layoutPitchForAvatarHotspot(placement.pitch),
    yaw: placement.yaw,
    type: "info",
    scale: false,
    cssClass: "rs-avatar-screen rs-avatar-screen--ghost",
    createTooltipFunc: createAvatarScreen as (
      hotSpotDiv: HTMLElement,
      args: unknown,
    ) => void,
    createTooltipArgs: args,
  };
}

/** Hotspots avatar avec référence DOM (post addHotSpot). */
export function getAvatarRuntimeHotspots(): ReadonlyMap<
  string,
  PannellumHotSpot & { id: string }
> {
  return runtimeHotspots;
}

/** Hotspots de la scène active dans Pannellum (même tableau que le runtime). */
export function getActiveSceneHotspots(
  viewer: PannellumViewer,
): (PannellumHotSpot & { id?: string })[] {
  return viewer.getConfig?.()?.hotSpots ?? [];
}

export function layoutAllAvatarHotspots(viewer: PannellumViewer): void {
  for (const hs of runtimeHotspots.values()) {
    const div = hs.div;
    if (div) {
      layoutPannellumHotspot(hs, viewer, 0, div);
    }
  }
}

/** Synchronise les hotspots avatar avec le stockage (ajout / suppression). */
export function syncAvatarHotspots(viewer: PannellumViewer): void {
  if (!viewer.addHotSpot || !viewer.removeHotSpot) return;

  for (const id of registeredHotspotIds) {
    viewer.removeHotSpot(id, SCENE_ID);
  }
  registeredHotspotIds.clear();
  runtimeHotspots.clear();
  clearAvatarHotspotElements();

  const placements = getAvatarPlacements();
  for (const placement of placements) {
    const spot = buildHotSpot(placement);
    viewer.addHotSpot!(spot, SCENE_ID);
    runtimeHotspots.set(spot.id, spot);
    registeredHotspotIds.add(spot.id);
  }
}

export function clearAvatarHotspotRegistry(): void {
  registeredHotspotIds.clear();
  runtimeHotspots.clear();
  clearAvatarHotspotElements();
}
