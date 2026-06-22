import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildAvatar, type AvatarBuildResult } from "./buildAvatar";
import {
  createAvatarMaterials,
  disposeAvatarMaterials,
  type AvatarMaterials,
} from "./avatarMaterials";
import { disposeAvatarGeometries } from "./disposeAvatar";
import { HEAD_BASE_Y } from "./proportions";
import type { AvatarConfig } from "./palettes";
import { applyBumpPose } from "./fightPose";
import { getAvatarWalkMotion, WALK_ANIM_SPEED } from "./avatarWalkHeading";
import { applyWalkPose } from "./walkPose";

export type AvatarSceneOptions = {
  /** Plafond devicePixelRatio (défaut 2, hotspot : 1.5). */
  pixelRatio?: number;
  /** Mode léger : une seule lumière directionnelle, pas d'ombres. */
  lite?: boolean;
  /** Suspendre la boucle quand le conteneur n'est pas visible. */
  pauseWhenHidden?: boolean;
  /** Animation de marche (landing). */
  walk?: boolean;
  /** Fond transparent, sans sol ni ombre (flottant dans le panorama). */
  ghost?: boolean;
  /** Variante mobile du fantôme (plus petit, caméra reculée). */
  ghostMobile?: boolean;
  /** ID placement (pour orientation pendant le wander). */
  placementId?: string;
  /** Rotation manuelle à la souris / au doigt (studio). */
  orbit?: boolean;
};

type ResolvedOptions = {
  pixelRatio: number;
  lite: boolean;
  pauseWhenHidden: boolean;
  walk: boolean;
  ghost: boolean;
  ghostMobile: boolean;
  placementId?: string;
  orbit: boolean;
};

function collectSharedMaterials(materials: AvatarMaterials): Set<THREE.Material> {
  return new Set(Object.values(materials));
}

export class AvatarScene {
  private readonly container: HTMLElement;
  private cfg: AvatarConfig;
  private readonly options: ResolvedOptions;

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private materials: AvatarMaterials | null = null;
  private sharedMaterials: Set<THREE.Material> | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private floor: THREE.Mesh | null = null;
  private contactShadow: THREE.Mesh | null = null;
  private avatar: AvatarBuildResult | null = null;

  private blinkTimer = 2.8;
  private blinkPhase = 0;

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

  private orbitYaw = 0.4;
  private orbitDragging = false;
  private orbitLastX = 0;
  private boundOrbitDown: ((e: PointerEvent) => void) | null = null;
  private boundOrbitMove: ((e: PointerEvent) => void) | null = null;
  private boundOrbitUp: ((e: PointerEvent) => void) | null = null;

  constructor(
    container: HTMLElement,
    cfg: AvatarConfig,
    options?: AvatarSceneOptions,
  ) {
    this.container = container;
    this.cfg = cfg;
    this.options = {
      pixelRatio:
        options?.pixelRatio ??
        Math.min(
          typeof window !== "undefined" ? window.devicePixelRatio : 1,
          2,
        ),
      lite: options?.lite ?? false,
      pauseWhenHidden: options?.pauseWhenHidden ?? true,
      walk: options?.walk ?? false,
      ghost: options?.ghost ?? false,
      ghostMobile: options?.ghostMobile ?? false,
      placementId: options?.placementId,
      orbit: options?.orbit ?? false,
    };
  }

  mount(): void {
    if (this.mounted || this.disposed) return;

    const scene = new THREE.Scene();
    const ghostMobile = this.options.ghost && this.options.ghostMobile;
    const camera = new THREE.PerspectiveCamera(
      this.options.ghost ? (ghostMobile ? 30 : 42) : 32,
      1,
      0.1,
      100,
    );
    if (this.options.ghost) {
      if (ghostMobile) {
        camera.position.set(0, 1.28, 8.6);
        camera.lookAt(0, 1.02, 0);
      } else {
        camera.position.set(0, 1.34, 5.45);
        camera.lookAt(0, 1.06, 0);
      }
    } else {
      camera.position.set(0.2, 1.55, 5.4);
      camera.lookAt(0, 1.18, 0);
    }

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = this.options.lite ? 1.1 : 1.06;
    renderer.setPixelRatio(
      Math.min(
        typeof window !== "undefined" ? window.devicePixelRatio : 1,
        this.options.pixelRatio,
      ),
    );

    if (!this.options.lite) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    if (this.options.ghost) {
      renderer.domElement.style.background = "transparent";
    }

    if (this.options.lite) {
      scene.add(new THREE.HemisphereLight(0xfff8f2, 0x9aa8b5, 0.42));
      const dir = new THREE.DirectionalLight(0xffffff, 1.65);
      dir.position.set(2.2, 4.2, 3.4);
      scene.add(dir);
      const fill = new THREE.DirectionalLight(0xe8f4ff, 0.55);
      fill.position.set(-1.5, 2.2, 4.8);
      scene.add(fill);
    } else {
      scene.add(new THREE.HemisphereLight(0xfffaf5, 0xc8d2da, 0.62));

      const key = new THREE.DirectionalLight(0xffffff, 1.75);
      key.position.set(3.2, 6.2, 4.4);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.radius = 8;
      key.shadow.bias = -0.0005;
      const sc = key.shadow.camera;
      sc.near = 1;
      sc.far = 20;
      sc.left = -3;
      sc.right = 3;
      sc.top = 4;
      sc.bottom = -1;
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xf0f6ff, 0.45);
      fill.position.set(-1.2, 2.8, 5.2);
      scene.add(fill);

      const rim = new THREE.DirectionalLight(0xb8e4ff, 0.58);
      rim.position.set(-4, 3.5, -3);
      scene.add(rim);
    }

    if (!this.options.ghost) {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.ShadowMaterial({ opacity: this.options.lite ? 0 : 0.26 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = !this.options.lite;
      scene.add(floor);
      this.floor = floor;
    }

    if (!this.options.lite) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const room = new RoomEnvironment();
      const envTarget = pmrem.fromScene(room, 0.04);
      scene.environment = envTarget.texture;
      room.dispose();
      this.pmrem = pmrem;
      this.envTarget = envTarget;
    } else {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const envTarget = pmrem.fromScene(room, 0.04);
      scene.environment = envTarget.texture;
      room.dispose();
      this.pmrem = pmrem;
      this.envTarget = envTarget;
    }

    const materials = createAvatarMaterials(THREE);
    const sharedMaterials = collectSharedMaterials(materials);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.materials = materials;
    this.sharedMaterials = sharedMaterials;
    this.mounted = true;

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);

    if (this.options.pauseWhenHidden) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          this.visible = entry?.isIntersecting ?? true;
          if (this.visible) {
            this.startLoop();
          } else {
            this.stopLoop();
          }
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

    if (this.options.orbit) {
      this.bindOrbitControls();
    }

    this.rebuildAvatar(this.cfg);
    this.startLoop();
  }

  setConfig(cfg: AvatarConfig): void {
    this.cfg = cfg;
    if (!this.mounted || this.disposed) return;
    this.rebuildAvatar(cfg);
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

    this.unbindOrbitControls();

    if (this.avatar && this.scene && this.sharedMaterials) {
      this.scene.remove(this.avatar.group);
      disposeAvatarGeometries(this.avatar.group, this.sharedMaterials);
      this.avatar = null;
    }

    if (this.floor) {
      this.floor.geometry.dispose();
      (this.floor.material as THREE.Material).dispose();
      this.floor = null;
    }

    if (this.contactShadow) {
      const mat = this.contactShadow.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
      this.contactShadow.geometry.dispose();
      this.contactShadow = null;
    }

    this.envTarget?.dispose();
    this.pmrem?.dispose();

    if (this.materials) {
      disposeAvatarMaterials(this.materials);
      this.materials = null;
    }

    this.renderer?.dispose();
    if (
      this.renderer?.domElement &&
      this.renderer.domElement.parentElement === this.container
    ) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.sharedMaterials = null;
    this.mounted = false;
    this.clock = null;
  }

  private rebuildAvatar(cfg: AvatarConfig): void {
    if (!this.scene || !this.materials || !this.sharedMaterials) return;

    if (this.avatar) {
      this.scene.remove(this.avatar.group);
      disposeAvatarGeometries(this.avatar.group, this.sharedMaterials);
      this.avatar = null;
    }

    const built = buildAvatar(THREE, cfg, this.materials);
    this.scene.add(built.group);
    this.avatar = built;
    this.blinkTimer = 2.5 + Math.random() * 2;
    this.blinkPhase = 0;
  }

  private resize(): void {
    if (!this.camera || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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
    if (!this.scene || !this.camera || !this.renderer || !this.clock) return;

    const elapsed = this.clock.getElapsedTime();
    const delta = Math.min(0.05, this.clock.getDelta());
    const avatar = this.avatar;

    if (avatar && !this.reducedMotion) {
      if (this.options.walk) {
        const placementId = this.options.placementId;
        const motion = placementId ? getAvatarWalkMotion(placementId) : null;
        if (motion && motion.bumpPhase > 0.02) {
          applyBumpPose(
            avatar,
            motion.bumpPhase,
            motion.bumpFacingY,
            motion.bumpLeaveFacingY,
          );
        } else {
          applyWalkPose(avatar, elapsed, {
            speed: motion?.speed ?? WALK_ANIM_SPEED,
            headingY: motion?.headingY ?? 0,
            turnLean: motion?.turnLean ?? 0,
          });
        }
      } else if (this.options.orbit) {
        avatar.group.rotation.y = this.orbitYaw;
        avatar.group.rotation.z = 0;
        avatar.group.position.y = 0;
        const breath = Math.sin(elapsed * 1.55) * 0.01;
        avatar.parts.body.scale.y = 1 + breath;
        avatar.parts.head.position.y =
          HEAD_BASE_Y + Math.sin(elapsed * 1.6 + 0.4) * 0.01;
        avatar.parts.head.rotation.y = Math.sin(elapsed * 0.5) * 0.05;
      } else {
        avatar.group.rotation.y = elapsed * 0.32;
        avatar.group.rotation.z = Math.sin(elapsed * 0.85) * 0.01;
        avatar.group.position.y = Math.sin(elapsed * 1.2) * 0.004;
        const breath = Math.sin(elapsed * 1.55) * 0.01;
        avatar.parts.body.scale.y = 1 + breath;
        avatar.parts.head.position.y =
          HEAD_BASE_Y + Math.sin(elapsed * 1.6 + 0.4) * 0.01;
        avatar.parts.head.rotation.y = Math.sin(elapsed * 0.5) * 0.05;
      }

      this.blinkTimer -= delta;
      if (this.blinkTimer <= 0 && this.blinkPhase <= 0) {
        this.blinkPhase = 0.16;
        this.blinkTimer = 2.5 + Math.random() * 3.5;
      }

      if (this.blinkPhase > 0) {
        this.blinkPhase -= delta;
        const ph = Math.max(0, this.blinkPhase / 0.16);
        const open = Math.abs(ph - 0.5) * 2;
        avatar.parts.eyes.scale.y = 0.12 + 0.88 * open;
      } else {
        avatar.parts.eyes.scale.y = 1;
      }
    } else if (avatar) {
      const motion = this.options.placementId
        ? getAvatarWalkMotion(this.options.placementId)
        : null;
      avatar.group.rotation.x = 0;
      avatar.group.rotation.y = this.options.walk ? (motion?.headingY ?? 0) : 0.4;
      avatar.group.rotation.z = this.options.walk ? (motion?.turnLean ?? 0) : 0;
      avatar.group.position.y = 0;
      avatar.parts.body.scale.y = 1;
      avatar.parts.head.position.y = HEAD_BASE_Y;
      avatar.parts.head.rotation.y = 0;
      avatar.parts.eyes.scale.y = 1;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private bindOrbitControls(): void {
    this.container.style.touchAction = "none";
    this.container.style.cursor = "grab";

    this.boundOrbitDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      this.orbitDragging = true;
      this.orbitLastX = e.clientX;
      this.container.style.cursor = "grabbing";
      this.container.setPointerCapture(e.pointerId);
    };

    this.boundOrbitMove = (e: PointerEvent) => {
      if (!this.orbitDragging) return;
      const delta = e.clientX - this.orbitLastX;
      this.orbitLastX = e.clientX;
      this.orbitYaw += delta * 0.012;
    };

    this.boundOrbitUp = (e: PointerEvent) => {
      if (!this.orbitDragging) return;
      this.orbitDragging = false;
      this.container.style.cursor = "grab";
      if (this.container.hasPointerCapture(e.pointerId)) {
        this.container.releasePointerCapture(e.pointerId);
      }
    };

    this.container.addEventListener("pointerdown", this.boundOrbitDown);
    this.container.addEventListener("pointermove", this.boundOrbitMove);
    this.container.addEventListener("pointerup", this.boundOrbitUp);
    this.container.addEventListener("pointercancel", this.boundOrbitUp);
  }

  private unbindOrbitControls(): void {
    if (this.boundOrbitDown) {
      this.container.removeEventListener("pointerdown", this.boundOrbitDown);
    }
    if (this.boundOrbitMove) {
      this.container.removeEventListener("pointermove", this.boundOrbitMove);
    }
    if (this.boundOrbitUp) {
      this.container.removeEventListener("pointerup", this.boundOrbitUp);
      this.container.removeEventListener("pointercancel", this.boundOrbitUp);
    }
    this.boundOrbitDown = null;
    this.boundOrbitMove = null;
    this.boundOrbitUp = null;
    this.container.style.cursor = "";
    this.container.style.touchAction = "";
  }
}
