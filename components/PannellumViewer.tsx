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
import { openMiiStudio } from "@/lib/landing/miiStudioBus";
import { layoutRegisteredAvatarHotspots } from "@/lib/panorama/avatarHotspotElements";

const PANNELLUM_JS =
  "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";

const PANORAMA_URL = "/360bg.jpeg";

const TEE_IMAGE_URL = "/tee.png";

/** Repositionner les hotspots : modifier pitch / yaw ici. */
const PRODUCT_HOTSPOT = {
  pitch: -6,
  yaw: -104,
} as const;

const HOTSPOT_CONFIG = {
  product: PRODUCT_HOTSPOT,
  portail: {
    pitch: 0.5,
    yaw: -11,
    label: "BUREAU",
    href: "https://portail.recrutestagiaire.eu",
  },
  grillz: {
    pitch: -3,
    yaw: 153,
    label: "GRILLZ",
    href: "https://recrutestagiaire.eu/pages/grillz",
  },
  miiStudio: {
    /** Mur vide à droite — loin produit (-104), portail (-11) et grillz (153). */
    pitch: -3,
    yaw: 58,
  },
};

/** true = clic dans le 360 → pitch/yaw dans la console. */
const HOTSPOT_DEBUG = false;

type ProductHotspotArgs = {
  title: string;
  price: string;
  image: string;
  href: string;
};

type NavHotspotArgs = {
  direction: "left" | "right" | "down";
  label: string;
  href?: string;
  sceneId?: string;
};

type MiiStudioHotspotArgs = Record<string, never>;

const MII_PANEL_COPY = {
  title: "Mon stagiaire",
  desc: "Créez votre Corporate Stagiaire et posez-le dans le salon.",
  cta: "Déposer son Stagiaire",
} as const;

const bindMiiStudioOpen = (el: HTMLElement) => {
  const stop = (e: Event) => {
    e.stopPropagation();
  };
  const open = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    openMiiStudio();
  };

  el.addEventListener("pointerdown", stop);
  el.addEventListener("mousedown", stop);
  el.addEventListener("mouseup", stop);
  el.addEventListener("touchstart", stop, { passive: true });
  el.addEventListener("touchend", stop, { passive: true });
  el.addEventListener("pointerup", (e) => {
    stop(e);
    open(e);
  });
  el.addEventListener("click", (e) => {
    stop(e);
    open(e);
  });
};

const centerHotspotPanel = (
  hotSpotDiv: HTMLElement,
  panel: HTMLElement,
) => {
  const tw = panel.offsetWidth;
  const th = panel.offsetHeight;
  const dw = hotSpotDiv.offsetWidth;
  panel.style.marginLeft = `${-((tw - dw) / 2)}px`;
  panel.style.marginTop = `${-(th / 2)}px`;
};

const createMiiStudioHotspot = (
  hotSpotDiv: HTMLElement,
  _args: MiiStudioHotspotArgs,
) => {
  hotSpotDiv.classList.add("rs-mii-studio-hotspot", "pnlm-pointer");
  hotSpotDiv.style.width = "10px";
  hotSpotDiv.style.height = "10px";
  hotSpotDiv.style.background = "transparent";
  hotSpotDiv.style.border = "none";
  hotSpotDiv.style.overflow = "visible";

  const panel = document.createElement("button");
  panel.type = "button";
  panel.className = "rs-mii-studio-panel";
  panel.setAttribute("aria-label", "Ouvrir le configurateur stagiaire");
  panel.innerHTML = `
    <span class="rs-mii-studio-panel__tags">
      <span class="rs-mii-studio-panel__tag rs-mii-studio-panel__tag--pink">Studio avatar</span>
      <span class="rs-mii-studio-panel__tag rs-mii-studio-panel__tag--blue">Salon 360°</span>
    </span>
    <span class="rs-mii-studio-panel__title">${MII_PANEL_COPY.title}</span>
    <span class="rs-mii-studio-panel__desc">${MII_PANEL_COPY.desc}</span>
    <span class="rs-mii-studio-panel__cta">${MII_PANEL_COPY.cta}</span>
  `;

  bindMiiStudioOpen(panel);
  hotSpotDiv.appendChild(panel);

  bindMiiStudioOpen(hotSpotDiv);

  requestAnimationFrame(() => centerHotspotPanel(hotSpotDiv, panel));
  setTimeout(() => centerHotspotPanel(hotSpotDiv, panel), 120);
};

const NAV_ARROW_SVG = {
  right: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  left: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  down: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 19 19 12"/></svg>`,
} as const;

const createNavHotspot = (
  hotSpotDiv: HTMLElement,
  args: NavHotspotArgs,
) => {
  hotSpotDiv.classList.add("rs-nav-hotspot", "pnlm-pointer");

  const stack = document.createElement("div");
  stack.className = "rs-nav-hotspot__stack";

  const label = document.createElement("div");
  label.className = "rs-nav-hotspot__label";
  label.textContent = args.label;

  const inner = document.createElement("div");
  inner.className = "rs-nav-hotspot__inner";
  inner.innerHTML = NAV_ARROW_SVG[args.direction];

  stack.appendChild(label);
  stack.appendChild(inner);

  if (args.href) {
    const link = document.createElement("a");
    link.href = args.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "rs-nav-hotspot__link";
    link.appendChild(stack);
    link.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    hotSpotDiv.appendChild(link);
  } else {
    hotSpotDiv.appendChild(stack);
  }
};

const createProductHotspot = (
  hotSpotDiv: HTMLElement,
  args: ProductHotspotArgs,
) => {
  hotSpotDiv.classList.add("rs-product-hotspot");
  hotSpotDiv.style.width = "12px";
  hotSpotDiv.style.height = "12px";
  hotSpotDiv.style.borderRadius = "50%";
  hotSpotDiv.style.background = "#F472B6";
  hotSpotDiv.style.border = "2px solid #fff";
  hotSpotDiv.style.cursor = "pointer";

  const imageSrc = args.image || TEE_IMAGE_URL;

  const tooltip = document.createElement("div");
  tooltip.classList.add("rs-product-tooltip");
  tooltip.innerHTML = `
    <article class="rs-product-card">
      <div class="rs-product-card__tags">
        <span class="rs-product-card__tag rs-product-card__tag--green">Candidatures ouvertes</span>
        <span class="rs-product-card__tag rs-product-card__tag--blue">Boutique</span>
      </div>
      <h3 class="rs-product-card__title">${args.title}</h3>
      <div class="rs-product-card__img-block">
        <div class="rs-product-card__img-inner">
          <img
            class="rs-product-card__hero-img"
            src="${imageSrc}"
            alt="${args.title}"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
      <div class="rs-product-card__price-block">
        <div class="rs-product-card__price-label">Rémunération du poste</div>
        <div class="rs-product-card__price">${args.price}</div>
      </div>
      <a href="${args.href}" target="_blank" rel="noopener noreferrer" class="rs-product-card__cta">Voir la fiche →</a>
    </article>
  `;
  hotSpotDiv.appendChild(tooltip);

  tooltip.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  const cta = tooltip.querySelector<HTMLAnchorElement>(".rs-product-card__cta");
  cta?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  setTimeout(() => {
    const tw = tooltip.scrollWidth;
    const th = tooltip.scrollHeight;
    const dw = hotSpotDiv.offsetWidth;
    tooltip.style.marginLeft = `${-((tw - dw) / 2)}px`;
    tooltip.style.marginTop = `${-(th / 2)}px`;
  }, 100);
};

function getMouseZoom(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth > 768;
}

function getSceneHfov(): number {
  if (typeof window === "undefined") return 100;
  if (window.innerWidth <= 390) return 118;
  if (window.innerWidth <= 768) return 112;
  return 100;
}

function buildViewerConfig() {
  const productHref =
    process.env.NEXT_PUBLIC_PRODUCT_URL ||
    "https://recrutestagiaire.eu/products/stagiaire";

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
        pitch: HOTSPOT_CONFIG.product.pitch,
        yaw: HOTSPOT_CONFIG.product.yaw,
        autoLoad: true,
        autoRotate: false,
        compass: false,
        showZoomCtrl: false,
        showFullscreenCtrl: false,
        mouseZoom: getMouseZoom(),
        hfov: getSceneHfov(),
        hotSpotDebug: HOTSPOT_DEBUG,
        hotSpots: [
          {
            pitch: HOTSPOT_CONFIG.product.pitch,
            yaw: HOTSPOT_CONFIG.product.yaw,
            scale: false,
            cssClass: "rs-product-hotspot-wrap",
            createTooltipFunc: createProductHotspot,
            createTooltipArgs: {
              title:
                process.env.NEXT_PUBLIC_PRODUCT_TITLE || "Stagiaire",
              price: process.env.NEXT_PUBLIC_PRODUCT_PRICE || "40,00 €",
              image:
                process.env.NEXT_PUBLIC_PRODUCT_IMAGE || TEE_IMAGE_URL,
              href: productHref,
            },
          },
          {
            pitch: HOTSPOT_CONFIG.portail.pitch,
            yaw: HOTSPOT_CONFIG.portail.yaw,
            scale: false,
            cssClass: "rs-nav-hotspot",
            createTooltipFunc: createNavHotspot,
            createTooltipArgs: {
              direction: "down",
              label: HOTSPOT_CONFIG.portail.label,
              href: HOTSPOT_CONFIG.portail.href,
            },
          },
          {
            pitch: HOTSPOT_CONFIG.grillz.pitch,
            yaw: HOTSPOT_CONFIG.grillz.yaw,
            scale: false,
            cssClass: "rs-nav-hotspot",
            createTooltipFunc: createNavHotspot,
            createTooltipArgs: {
              direction: "down",
              label: HOTSPOT_CONFIG.grillz.label,
              href: HOTSPOT_CONFIG.grillz.href,
            },
          },
          {
            pitch: HOTSPOT_CONFIG.miiStudio.pitch,
            yaw: HOTSPOT_CONFIG.miiStudio.yaw,
            scale: false,
            cssClass: "rs-mii-studio-hotspot",
            createTooltipFunc: createMiiStudioHotspot,
            createTooltipArgs: {},
            clickHandlerFunc: () => openMiiStudio(),
          },
        ],
      },
    },
  };
}

/**
 * Précharge et décode la texture en CORS "anonymous" AVANT l'init de Pannellum.
 * Garantit que l'image est dans le cache (même entrée CORS que Pannellum) et
 * complètement décodée → évite la race WebGL texImage2D "no image" (Safari).
 */
async function preloadPanorama(): Promise<void> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "sync";
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

    const bootAvatarHotspots = () => {
      if (cancelled || !viewerRef.current || avatarsBooted) return;
      avatarsBooted = true;
      // setUpdate(true) UNIQUEMENT après "load" : la texture est alors prête.
      // Le faire avant déclenche texImage2D sur une image pas encore chargée
      // (erreur WebGL 1281 "no image").
      viewerRef.current.setUpdate?.(true);
      syncAvatarHotspots(viewerRef.current);
      startAvatarWanderLoop(viewerRef.current);
      layoutRegisteredAvatarHotspots(viewerRef.current);
    };

    async function init() {
      try {
        const [,] = await Promise.all([
          loadPannellumScript(),
          ensureAvatarPlacementsHydrated(),
          preloadPanorama(),
        ]);
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

        bootAvatars = bootAvatarHotspots;

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
