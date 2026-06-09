"use client";

import { useEffect, useRef } from "react";

const PANNELLUM_JS =
  "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";

const PANORAMA_URL = "/360bg.png";

const TEE_IMAGE_URL = "/tee.png";

/** Décalages pitch/yaw autour du hotspot produit pour les fantômes. */
const GHOST_OFFSETS = [
  { dp: -8, dy: -35, delay: 0 },
  { dp: -10, dy: -22, delay: 1 },
  { dp: -9, dy: -10, delay: 2 },
  { dp: -11, dy: 4, delay: 3 },
  { dp: -8, dy: 16, delay: 4 },
  { dp: -12, dy: 28, delay: 5 },
  { dp: -10, dy: -28, delay: 6 },
  { dp: -9, dy: 22, delay: 7 },
  { dp: -11, dy: -14, delay: 8 },
  { dp: -7, dy: 10, delay: 9 },
] as const;

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
  ghosts: GHOST_OFFSETS.map((o) => ({
    pitch: PRODUCT_HOTSPOT.pitch + o.dp,
    yaw: PRODUCT_HOTSPOT.yaw + o.dy,
    image: "/images/tshirt.png",
    delay: o.delay,
  })),
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

type GhostHotspotArgs = {
  image: string;
  delay: number;
};

const createGhostHotspot = (
  hotSpotDiv: HTMLElement,
  args: GhostHotspotArgs,
) => {
  hotSpotDiv.classList.add("rs-ghost-hotspot");
  hotSpotDiv.style.cssText = `
    width: 110px;
    height: 1px;
    background: transparent;
    border: none;
    overflow: visible;
    pointer-events: none;
  `;

  const img = document.createElement("img");
  img.src = args.image;
  img.alt = "";
  img.className = "rs-ghost-img";
  img.style.animationDelay = `${args.delay}s`;
  img.draggable = false;

  hotSpotDiv.appendChild(img);
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
        pitch: HOTSPOT_CONFIG.product.pitch,
        yaw: HOTSPOT_CONFIG.product.yaw,
        autoLoad: true,
        autoRotate: false,
        compass: false,
        showZoomCtrl: false,
        showFullscreenCtrl: false,
        mouseZoom: false,
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
              price: process.env.NEXT_PUBLIC_PRODUCT_PRICE || "60,00 €",
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
          ...HOTSPOT_CONFIG.ghosts.map((g) => ({
            pitch: g.pitch,
            yaw: g.yaw,
            type: "info",
            scale: false,
            cssClass: "rs-ghost-hotspot",
            createTooltipFunc: createGhostHotspot,
            createTooltipArgs: { image: g.image, delay: g.delay },
          })),
        ],
      },
    },
  };
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

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const onResize = () => {
      viewerRef.current?.setHfov?.(getSceneHfov(), false);
    };

    async function init() {
      try {
        await loadPannellumScript();
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

        window.addEventListener("resize", onResize);
      } catch {
        // Viewer stays empty if CDN is unavailable
      }
    }

    init();

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, []);

  return (
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
  );
}
