import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { AvatarConfig } from "./palettes";
import { AvatarViewCore } from "./avatarViewCore";

export type AvatarSceneOptions = {
  /** Plafond devicePixelRatio. */
  pixelRatio?: number;
  /** Éclairage léger sans ombres. */
  lite?: boolean;
  /** Suspendre la boucle quand le conteneur n'est pas visible. */
  pauseWhenHidden?: boolean;
  /** Rotation manuelle à la souris / au doigt. */
  orbit?: boolean;
};

/**
 * Aperçu 3D d'un Mii avec son propre renderer (studio / page de test).
 * Pour les Miis du salon (multiples), voir `avatarStage` qui partage un renderer.
 */
export class AvatarScene {
  private readonly container: HTMLElement;
  private cfg: AvatarConfig;
  private readonly lite: boolean;
  private readonly pixelRatio: number;
  private readonly pauseWhenHidden: boolean;
  private readonly orbit: boolean;

  private renderer: THREE.WebGLRenderer | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private core: AvatarViewCore | null = null;

  private mounted = false;
  private disposed = false;
  private visible = true;
  private reducedMotion = false;

  private rafId: number | null = null;
  private clock: THREE.Clock | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private motionMq: MediaQueryList | null = null;
  private onMotionChange: (() => void) | null = null;

  private dragging = false;
  private lastX = 0;
  private onPointerDown: ((e: PointerEvent) => void) | null = null;
  private onPointerMove: ((e: PointerEvent) => void) | null = null;
  private onPointerUp: ((e: PointerEvent) => void) | null = null;

  constructor(
    container: HTMLElement,
    cfg: AvatarConfig,
    options?: AvatarSceneOptions,
  ) {
    this.container = container;
    this.cfg = cfg;
    this.lite = options?.lite ?? false;
    this.pauseWhenHidden = options?.pauseWhenHidden ?? true;
    this.orbit = options?.orbit ?? false;
    this.pixelRatio = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio : 1,
      options?.pixelRatio ?? 2,
    );
  }

  mount(): void {
    if (this.mounted || this.disposed) return;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !this.lite,
      premultipliedAlpha: false,
      powerPreference: "default",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = this.lite ? 1.1 : 1.06;
    renderer.setPixelRatio(this.pixelRatio);
    if (!this.lite) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.container.appendChild(canvas);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envTarget = pmrem.fromScene(room, 0.04);
    room.dispose();

    this.renderer = renderer;
    this.pmrem = pmrem;
    this.envTarget = envTarget;
    this.core = new AvatarViewCore(
      this.cfg,
      { mode: this.orbit ? "orbit" : "idle", ghost: false, lite: this.lite },
      envTarget.texture,
    );

    this.mounted = true;
    this.resize();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);

    if (this.pauseWhenHidden) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          this.visible = entries[0]?.isIntersecting ?? true;
          if (this.visible) this.startLoop();
          else this.stopLoop();
        },
        { threshold: 0.08 },
      );
      this.intersectionObserver.observe(this.container);
    }

    this.motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.onMotionChange = () => {
      this.reducedMotion = this.motionMq?.matches ?? false;
    };
    this.onMotionChange();
    this.motionMq.addEventListener("change", this.onMotionChange);

    if (this.orbit) this.bindOrbit();

    this.startLoop();
  }

  setConfig(cfg: AvatarConfig): void {
    this.cfg = cfg;
    this.core?.setConfig(cfg);
  }

  pause(): void {
    if (this.disposed || !this.mounted) return;
    this.visible = false;
    this.stopLoop();
  }

  resume(): void {
    if (this.disposed || !this.mounted) return;
    this.visible = true;
    this.resize();
    this.startLoop();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopLoop();

    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    if (this.motionMq && this.onMotionChange) {
      this.motionMq.removeEventListener("change", this.onMotionChange);
    }
    this.unbindOrbit();

    this.core?.dispose();
    this.envTarget?.dispose();
    this.pmrem?.dispose();

    const canvas = this.renderer?.domElement;
    if (canvas && canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
    this.renderer?.dispose();

    this.core = null;
    this.renderer = null;
    this.pmrem = null;
    this.envTarget = null;
    this.clock = null;
    this.mounted = false;
  }

  private resize(): void {
    if (!this.renderer || !this.core) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.core.setAspect(w / h);
    this.renderer.setSize(w, h, false);
  }

  private startLoop(): void {
    if (this.rafId !== null || this.disposed) return;
    this.clock = this.clock ?? new THREE.Clock();
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      if (this.disposed || !this.visible) return;
      this.step();
    };
    tick();
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private step(): void {
    if (!this.renderer || !this.core || !this.clock) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.getElapsedTime();
    this.core.update(dt, elapsed, this.reducedMotion);
    this.renderer.render(this.core.scene, this.core.camera);
  }

  private bindOrbit(): void {
    this.container.style.touchAction = "none";
    this.container.style.cursor = "grab";

    this.onPointerDown = (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.container.style.cursor = "grabbing";
      this.container.setPointerCapture(e.pointerId);
    };
    this.onPointerMove = (e) => {
      if (!this.dragging || !this.core) return;
      this.core.orbitYaw += (e.clientX - this.lastX) * 0.012;
      this.lastX = e.clientX;
    };
    this.onPointerUp = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.container.style.cursor = "grab";
      if (this.container.hasPointerCapture(e.pointerId)) {
        this.container.releasePointerCapture(e.pointerId);
      }
    };

    this.container.addEventListener("pointerdown", this.onPointerDown);
    this.container.addEventListener("pointermove", this.onPointerMove);
    this.container.addEventListener("pointerup", this.onPointerUp);
    this.container.addEventListener("pointercancel", this.onPointerUp);
  }

  private unbindOrbit(): void {
    if (this.onPointerDown) {
      this.container.removeEventListener("pointerdown", this.onPointerDown);
    }
    if (this.onPointerMove) {
      this.container.removeEventListener("pointermove", this.onPointerMove);
    }
    if (this.onPointerUp) {
      this.container.removeEventListener("pointerup", this.onPointerUp);
      this.container.removeEventListener("pointercancel", this.onPointerUp);
    }
    this.onPointerDown = null;
    this.onPointerMove = null;
    this.onPointerUp = null;
    this.container.style.cursor = "";
    this.container.style.touchAction = "";
  }
}
