import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { AvatarConfig } from "./palettes";
import { AvatarViewCore } from "./avatarViewCore";

export type GhostHandle = {
  setConfig: (cfg: AvatarConfig) => void;
  dispose: () => void;
};

type GhostView = {
  anchor: HTMLElement;
  core: AvatarViewCore;
};

function devicePixelRatioCapped(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

/**
 * Renderer WebGL UNIQUE pour tous les Miis du salon.
 * Chaque Mii est dessiné dans sa région d'écran (scissor) sur un canvas overlay,
 * ce qui garde un seul contexte WebGL quel que soit le nombre de Miis.
 */
class AvatarStage {
  private renderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private environment: THREE.Texture | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;

  private readonly views = new Set<GhostView>();
  private rafId = 0;
  private clock: THREE.Clock | null = null;
  private reducedMotion = false;
  private sizeW = 0;
  private sizeH = 0;

  private onVisibility: (() => void) | null = null;
  private motionMq: MediaQueryList | null = null;
  private onMotion: (() => void) | null = null;

  addGhost(
    anchor: HTMLElement,
    cfg: AvatarConfig,
    opts: { ghostMobile?: boolean; placementId?: string },
  ): GhostHandle {
    this.ensure();

    const core = new AvatarViewCore(
      cfg,
      {
        mode: "walk",
        ghost: true,
        ghostMobile: opts.ghostMobile,
        lite: true,
        placementId: opts.placementId,
      },
      this.environment,
    );

    const view: GhostView = { anchor, core };
    this.views.add(view);
    this.start();

    return {
      setConfig: (next) => core.setConfig(next),
      dispose: () => {
        this.views.delete(view);
        core.dispose();
        if (this.views.size === 0) this.stop();
      },
    };
  }

  private ensure(): void {
    if (this.renderer || typeof window === "undefined") return;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: "default",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(devicePixelRatioCapped());
    renderer.autoClear = false;

    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "20",
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(canvas);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    room.dispose();

    this.renderer = renderer;
    this.canvas = canvas;
    this.pmrem = pmrem;
    this.environment = target.texture;
    this.clock = new THREE.Clock();

    this.motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.onMotion = () => {
      this.reducedMotion = this.motionMq?.matches ?? false;
    };
    this.onMotion();
    this.motionMq.addEventListener("change", this.onMotion);

    this.onVisibility = () => {
      if (document.hidden) this.stop();
      else if (this.views.size > 0) this.start();
    };
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  private start(): void {
    if (this.rafId || !this.renderer) return;
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      this.renderFrame();
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private renderFrame(): void {
    const renderer = this.renderer;
    const clock = this.clock;
    if (!renderer || !clock) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w !== this.sizeW || h !== this.sizeH) {
      renderer.setPixelRatio(devicePixelRatioCapped());
      renderer.setSize(w, h, false);
      this.sizeW = w;
      this.sizeH = h;
    }

    const dt = Math.min(0.05, clock.getDelta());
    const elapsed = clock.getElapsedTime();

    renderer.setScissorTest(false);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.setScissorTest(true);

    for (const view of this.views) {
      const r = view.anchor.getBoundingClientRect();
      if (
        r.width <= 0 ||
        r.height <= 0 ||
        r.bottom <= 0 ||
        r.right <= 0 ||
        r.top >= h ||
        r.left >= w
      ) {
        continue;
      }

      const x = r.left;
      const y = h - r.bottom;
      renderer.setViewport(x, y, r.width, r.height);
      renderer.setScissor(x, y, r.width, r.height);
      renderer.clearDepth();

      view.core.setAspect(r.width / r.height);
      view.core.update(dt, elapsed, this.reducedMotion);
      renderer.render(view.core.scene, view.core.camera);
    }
  }
}

export const avatarStage = new AvatarStage();
