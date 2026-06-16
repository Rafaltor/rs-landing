import {
  getAvatarPlacements,
  hotspotIdForPlacement,
} from "@/lib/avatar/avatarPlacements";
import { updateAvatarWalkMotionForHotspot } from "@/lib/avatar/avatarWalkHeading";
import {
  forcePannellumHotspotRepaint,
  layoutRegisteredAvatarHotspots,
  updateAvatarHotspotAngles,
} from "@/lib/panorama/avatarHotspotElements";
import {
  getAvatarRuntimeHotspots,
  getActiveSceneHotspots,
} from "@/lib/panorama/syncAvatarHotspots";

type Walker = {
  hotspotId: string;
  basePitch: number;
  baseYaw: number;
  phase: number;
  yawRate: number;
  pitchAmp: number;
  yawAmp: number;
  prevPitch: number;
  prevYaw: number;
};

let rafId = 0;
let activeViewer: PannellumViewer | null = null;
const walkers: Walker[] = [];

function wanderPosition(w: Walker): { pitch: number; yaw: number } {
  return {
    pitch: w.basePitch + Math.sin(w.phase * 0.75) * w.pitchAmp,
    yaw: w.baseYaw + Math.sin(w.phase * 0.5) * w.yawAmp + w.phase * w.yawRate,
  };
}

function normalizeYawDelta(delta: number): number {
  let d = delta;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function rebuildWalkers(): void {
  walkers.length = 0;
  for (const p of getAvatarPlacements()) {
    const seed = Math.abs(p.id.charCodeAt(0) + p.yaw);
    const phase = seed * 0.11;
    const walker: Walker = {
      hotspotId: hotspotIdForPlacement(p.id),
      basePitch: p.pitch,
      baseYaw: p.yaw,
      phase,
      yawRate: 0.22 + (seed % 7) * 0.04,
      pitchAmp: 1.2 + (seed % 5) * 0.25,
      yawAmp: 10 + (seed % 6) * 2.5,
      prevPitch: 0,
      prevYaw: 0,
    };
    const pos = wanderPosition(walker);
    walker.prevPitch = pos.pitch;
    walker.prevYaw = pos.yaw;
    walkers.push(walker);
  }
}

function syncHotspotConfig(
  viewer: PannellumViewer,
  hotspotId: string,
  pitch: number,
  yaw: number,
): void {
  const runtime = getAvatarRuntimeHotspots().get(hotspotId);
  if (runtime) {
    runtime.pitch = pitch;
    runtime.yaw = yaw;
    return;
  }
  const hs = getActiveSceneHotspots(viewer).find((h) => h.id === hotspotId);
  if (hs) {
    hs.pitch = pitch;
    hs.yaw = yaw;
  }
}

/** Déplace les hotspots avatar dans le panorama (parcours lent). */
export function startAvatarWanderLoop(viewer: PannellumViewer): void {
  stopAvatarWanderLoop();
  activeViewer = viewer;
  rebuildWalkers();

  const tick = () => {
    rafId = requestAnimationFrame(tick);
    const viewerRef = activeViewer;
    if (!viewerRef) return;

    for (const w of walkers) {
      w.phase += 0.014;
      const pos = wanderPosition(w);
      const deltaYaw = normalizeYawDelta(pos.yaw - w.prevYaw);
      const deltaPitch = pos.pitch - w.prevPitch;

      updateAvatarWalkMotionForHotspot(w.hotspotId, deltaYaw, deltaPitch);
      updateAvatarHotspotAngles(w.hotspotId, pos.pitch, pos.yaw);
      syncHotspotConfig(viewerRef, w.hotspotId, pos.pitch, pos.yaw);

      w.prevYaw = pos.yaw;
      w.prevPitch = pos.pitch;
    }

    layoutRegisteredAvatarHotspots(viewerRef);
    forcePannellumHotspotRepaint(viewerRef);
  };

  tick();
}

export function refreshAvatarWanderLoop(): void {
  rebuildWalkers();
}

export function stopAvatarWanderLoop(): void {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  activeViewer = null;
  walkers.length = 0;
}
