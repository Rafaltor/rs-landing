"use client";

import { useEffect, useRef, useState } from "react";
import GyroscopeButton from "./GyroscopeButton";
import { disposeAllAvatarScreens } from "@/lib/avatar/avatarScreenHotspot";
import {
  ensureAvatarPlacementsHydrated,
  subscribeAvatarPlacements,
} from "@/lib/avatar/avatarPlacements";
import {
  clearAvatarHotspotRegistry,
  syncAvatarHotspots,
} from "@/lib/panorama/syncAvatarHotspots";
import {
  refreshAvatarWanderLoop,
  startAvatarWanderLoop,
  stopAvatarWanderLoop,
} from "@/lib/panorama/avatarWanderLoop";
import { layoutRegisteredAvatarHotspots } from "@/lib/panorama/avatarHotspotElements";
import { getPanoramaPath } from "@/lib/siteConfig";

const PANNELLUM_JS =
  "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";

const PANORAMA_URL = getPanoramaPath();

/** Vue initiale du panorama au chargement. */
const DEFAULT_SCENE_VIEW = {
  pitch: -6,
  yaw: -104,
} as const;

/** true = clic dans le 360 → pitch/yaw dans la console. */
const HOTSPOT_DEBUG = false;

function getMouseZoom(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth > 768;
}

function getSceneHfov(): number {
  if (typeof window === "undefined") return 100;
  if (window.innerWidth <= 390) return 106;
  if (window.innerWidth <= 768) return 102;
  return 100;
}

function buildViewerConfig() {
  return {
    default: {
      firstScene: "salon",
      sceneFadeDuration: 800,
    },
    scenes: {
      salon: {
        type: "equirectangular",
        panorama: PANORAMA_URL,
        crossOrigin: "anonymous",
        pitch: DEFAULT_SCENE_VIEW.pitch,
        yaw: DEFAULT_SCENE_VIEW.yaw,
        autoLoad: true,
        autoRotate: false,
        compass: false,
        showZoomCtrl: false,
        showFullscreenCtrl: false,
        mouseZoom: getMouseZoom(),
        hfov: getSceneHfov(),
        hotSpotDebug: HOTSPOT_DEBUG,
        hotSpots: [],
      },
    },
  };
}

/**
 * Précharge légère (async) — ne bloque pas le main thread.
 * Même origine → pas de souci CORS ; Pannellum peut démarrer en parallèle.
 */
async function preloadPanorama(): Promise<void> {
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = PANORAMA_URL;
    if (typeof img.decode === "function") {
      await img.decode();
    } else {
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }
  } catch {
    // Non bloquant : Pannellum retentera le chargement de son côté.
  }
}

function loadPannellumScript(): Promise<void> {
  if (window.pannellum) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${PANNELLUM_JS}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.pannellum) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Pannellum script failed to load")),
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PANNELLUM_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Pannellum script failed to load"));
    document.head.appendChild(script);
  });
}

export default function PannellumViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumViewer | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const onResize = () => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      viewer.setHfov?.(getSceneHfov(), false);
      layoutRegisteredAvatarHotspots(viewer);
    };

    const onAnimate = () => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      layoutRegisteredAvatarHotspots(viewer);
    };

    let unsubPlacements: (() => void) | null = null;
    let bootAvatars: (() => void) | null = null;
    let avatarsBooted = false;
    let panoramaLoaded = false;
    let placementsReady = false;

    const tryBootAvatars = () => {
      if (cancelled || !viewerRef.current || avatarsBooted) return;
      if (!panoramaLoaded || !placementsReady) return;
      avatarsBooted = true;
      viewerRef.current.setUpdate?.(true);
      syncAvatarHotspots(viewerRef.current);
      startAvatarWanderLoop(viewerRef.current);
      layoutRegisteredAvatarHotspots(viewerRef.current);
    };

    async function init() {
      try {
        // Démarrer le viewer dès que le script Pannellum est prêt — ne pas
        // attendre Supabase ni le decode complet (c’était trop long).
        const scriptReady = loadPannellumScript();
        void preloadPanorama();
        const placementsPromise = ensureAvatarPlacementsHydrated().then(() => {
          placementsReady = true;
          tryBootAvatars();
        });

        await scriptReady;
        if (cancelled || !containerRef.current || !window.pannellum) {
          return;
        }

        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }

        viewerRef.current = window.pannellum.viewer(
          containerRef.current,
          buildViewerConfig() as PannellumTourConfig,
        );
        const viewer = viewerRef.current;

        bootAvatars = () => {
          panoramaLoaded = true;
          tryBootAvatars();
        };

        if (viewer.isLoaded?.()) {
          bootAvatars();
        } else {
          viewer.on?.("load", bootAvatars);
        }

        viewer.on?.("animate", onAnimate);

        setViewerReady(true);

        unsubPlacements = subscribeAvatarPlacements(() => {
          if (viewerRef.current) {
            disposeAllAvatarScreens();
            syncAvatarHotspots(viewerRef.current);
            refreshAvatarWanderLoop();
            layoutRegisteredAvatarHotspots(viewerRef.current);
          }
        });

        window.addEventListener("resize", onResize);
        await placementsPromise.catch(() => {});
      } catch {
        // Viewer stays empty if CDN is unavailable
      }
    }

    init();

    return () => {
      cancelled = true;
      setViewerReady(false);
      unsubPlacements?.();
      stopAvatarWanderLoop();
      if (bootAvatars) {
        viewerRef.current?.off?.("load", bootAvatars);
      }
      viewerRef.current?.off?.("animate", onAnimate);
      window.removeEventListener("resize", onResize);
      disposeAllAvatarScreens();
      clearAvatarHotspotRegistry();
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        id="pannellum-viewer"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
        }}
      />
      <GyroscopeButton viewerRef={viewerRef} viewerReady={viewerReady} />
    </>
  );
}
