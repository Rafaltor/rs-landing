import {
  getAvatarPlacements,
  hotspotIdForPlacement,
} from "@/lib/avatar/avatarPlacements";
import {
  decayAvatarBumpForHotspot,
  isAvatarBumping,
  updateAvatarWalkMotionForHotspot,
} from "@/lib/avatar/avatarWalkHeading";
import {
  layoutRegisteredAvatarHotspots,
  updateAvatarHotspotAngles,
} from "@/lib/panorama/avatarHotspotElements";
import { layoutPitchForAvatarHotspot } from "@/lib/panorama/avatarHotspotLayout";
import { clampAvatarPitch, maxPitchAmpForBase } from "@/lib/panorama/avatarPitchBounds";
import { depthFromSeed } from "@/lib/panorama/avatarDepth";
import { resolveAvatarCollisions, type WanderWalker, clearCollisionPairCooldowns, decayCollisionPairCooldowns, wrapWanderYaw } from "@/lib/panorama/avatarWanderCollisions";
import {
  getAvatarRuntimeHotspots,
  getActiveSceneHotspots,
} from "@/lib/panorama/syncAvatarHotspots";

/** Pas de simulation par défaut (~60 fps). */
export const WANDER_DT_DEFAULT = 1 / 60;

/** Vitesse de marche (degrés / seconde). */
export const WANDER_DIR_MIN = 7;
export const WANDER_DIR_MAX = 16;

/**
 * Oscillation verticale (degrés). L’amplitude réelle est plafonnée selon
 * la place restante jusqu’aux bornes pour éviter le bug de collage.
 */
export const WANDER_PITCH_AMP_MIN = 14;
export const WANDER_PITCH_AMP_MAX = 26;
export const WANDER_PHASE_RATE_MIN = 0.35;
export const WANDER_PHASE_RATE_MAX = 0.75;

/** Décalage de basePitch (degrés) pour étaler les Miis déjà en BDD au milieu. */
const BASE_PITCH_SPREAD = 28;

let rafId = 0;
let activeViewer: PannellumViewer | null = null;
let lastTickMs = 0;
const walkers: WanderWalker[] = [];

function normalizeYawDelta(delta: number): number {
  let d = delta;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function integrateWalker(w: WanderWalker, dt: number): void {
  w.phase += w.phaseRate * dt;
  w.pitch = clampAvatarPitch(w.basePitch + Math.sin(w.phase) * w.pitchAmp);

  if (!isAvatarBumping(w.hotspotId)) {
    w.yaw = wrapWanderYaw(w.yaw + w.dir * dt);
  }

  decayAvatarBumpForHotspot(w.hotspotId, dt);
}

function rebuildWalkers(): void {
  walkers.length = 0;
  clearCollisionPairCooldowns();
  for (const p of getAvatarPlacements()) {
    const seed = Math.abs(p.id.charCodeAt(0) + p.yaw + Math.floor(p.pitch * 10));
    const dirSign = seed % 2 === 0 ? 1 : -1;
    const dirMag =
      WANDER_DIR_MIN + (seed % 5) * ((WANDER_DIR_MAX - WANDER_DIR_MIN) / 4);

    const spread =
      (((seed % 11) - 5) / 5) * BASE_PITCH_SPREAD;
    const basePitch = clampAvatarPitch(p.pitch + spread);
    const desiredAmp =
      WANDER_PITCH_AMP_MIN +
      (seed % 6) *
        ((WANDER_PITCH_AMP_MAX - WANDER_PITCH_AMP_MIN) / 5);

    const walker: WanderWalker = {
      hotspotId: hotspotIdForPlacement(p.id),
      yaw: wrapWanderYaw(p.yaw),
      pitch: basePitch,
      basePitch,
      dir: dirSign * dirMag,
      phase: seed * 0.11,
      phaseRate:
        WANDER_PHASE_RATE_MIN +
        (seed % 4) *
          ((WANDER_PHASE_RATE_MAX - WANDER_PHASE_RATE_MIN) / 3),
      pitchAmp: maxPitchAmpForBase(basePitch, desiredAmp),
      depth: depthFromSeed(seed),
      prevYaw: wrapWanderYaw(p.yaw),
      prevPitch: basePitch,
    };
    walkers.push(walker);
  }
}

function syncHotspotConfig(
  viewer: PannellumViewer,
  hotspotId: string,
  pitch: number,
  yaw: number,
): void {
  const displayPitch = layoutPitchForAvatarHotspot(pitch);
  const runtime = getAvatarRuntimeHotspots().get(hotspotId);
  if (runtime) {
    runtime.pitch = displayPitch;
    runtime.yaw = yaw;
    return;
  }
  const hs = getActiveSceneHotspots(viewer).find((h) => h.id === hotspotId);
  if (hs) {
    hs.pitch = displayPitch;
    hs.yaw = yaw;
  }
}

/** Déplace les hotspots avatar dans le panorama (parcours intégré). */
export function startAvatarWanderLoop(viewer: PannellumViewer): void {
  stopAvatarWanderLoop();
  activeViewer = viewer;
  lastTickMs = 0;
  rebuildWalkers();

  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick);
    const viewerRef = activeViewer;
    if (!viewerRef) return;

    const dt =
      lastTickMs > 0
        ? Math.min(0.05, (now - lastTickMs) / 1000)
        : WANDER_DT_DEFAULT;
    lastTickMs = now;

    for (const w of walkers) {
      integrateWalker(w, dt);
    }

    decayCollisionPairCooldowns(dt);
    resolveAvatarCollisions(walkers, normalizeYawDelta);

    for (const w of walkers) {
      const deltaYaw = normalizeYawDelta(w.yaw - w.prevYaw);
      const deltaPitch = w.pitch - w.prevPitch;

      updateAvatarWalkMotionForHotspot(w.hotspotId, deltaYaw, deltaPitch);
      updateAvatarHotspotAngles(w.hotspotId, w.pitch, w.yaw, w.depth);
      syncHotspotConfig(viewerRef, w.hotspotId, w.pitch, w.yaw);

      w.prevYaw = w.yaw;
      w.prevPitch = w.pitch;
    }

    layoutRegisteredAvatarHotspots(viewerRef);
  };

  requestAnimationFrame(tick);
}

export function refreshAvatarWanderLoop(): void {
  rebuildWalkers();
}

export function stopAvatarWanderLoop(): void {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  activeViewer = null;
  lastTickMs = 0;
  walkers.length = 0;
  clearCollisionPairCooldowns();
}
