import * as THREE from "three";
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

/** "walk" = parcours salon, "orbit" = rotation manuelle, "idle" = rotation auto. */
export type AvatarViewMode = "walk" | "orbit" | "idle";

export type AvatarViewCoreOptions = {
  mode: AvatarViewMode;
  /** Fond transparent, sans sol ni ombre (Mii flottant). */
  ghost: boolean;
  /** Caméra reculée pour le rendu mobile. */
  ghostMobile?: boolean;
  /** Éclairage léger (pas d'ombres) — ghosts du salon. */
  lite: boolean;
  /** ID placement (orientation pendant le parcours). */
  placementId?: string;
};

function buildCamera(opts: AvatarViewCoreOptions): THREE.PerspectiveCamera {
  if (opts.ghost) {
    const fov = opts.ghostMobile ? 36 : 42;
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    if (opts.ghostMobile) {
      camera.position.set(0, 1.32, 6.25);
      camera.lookAt(0, 1.04, 0);
    } else {
      camera.position.set(0, 1.34, 5.45);
      camera.lookAt(0, 1.06, 0);
    }
    return camera;
  }
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0.2, 1.55, 5.4);
  camera.lookAt(0, 1.18, 0);
  return camera;
}

function addLights(scene: THREE.Scene, lite: boolean): void {
  if (lite) {
    scene.add(new THREE.HemisphereLight(0xfff8f2, 0x9aa8b5, 0.42));
    const dir = new THREE.DirectionalLight(0xffffff, 1.65);
    dir.position.set(2.2, 4.2, 3.4);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xe8f4ff, 0.55);
    fill.position.set(-1.5, 2.2, 4.8);
    scene.add(fill);
    return;
  }

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

/**
 * Scène + caméra + avatar d'un Mii, SANS renderer ni boucle d'animation.
 * Le renderer (partagé pour les ghosts, dédié pour le studio) appelle `update`
 * puis `renderer.render(core.scene, core.camera)`.
 */
export class AvatarViewCore {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly options: AvatarViewCoreOptions;

  /** Rotation manuelle (mode orbit). */
  orbitYaw = 0.4;

  private cfg: AvatarConfig;
  private materials: AvatarMaterials;
  private sharedMaterials: Set<THREE.Material>;
  private avatar: AvatarBuildResult | null = null;
  private floor: THREE.Mesh | null = null;
  private blinkTimer = 2.8;
  private blinkPhase = 0;
  private disposed = false;

  constructor(
    cfg: AvatarConfig,
    options: AvatarViewCoreOptions,
    environment: THREE.Texture | null,
  ) {
    this.cfg = cfg;
    this.options = options;

    const scene = new THREE.Scene();
    if (environment) scene.environment = environment;
    addLights(scene, options.lite);

    if (!options.ghost && !options.lite) {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.ShadowMaterial({ opacity: 0.26 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);
      this.floor = floor;
    }

    this.materials = createAvatarMaterials(THREE);
    this.sharedMaterials = new Set(Object.values(this.materials));

    this.scene = scene;
    this.camera = buildCamera(options);
    this.rebuild(cfg);
  }

  setEnvironment(environment: THREE.Texture | null): void {
    if (this.disposed) return;
    this.scene.environment = environment;
  }

  setConfig(cfg: AvatarConfig): void {
    if (this.disposed) return;
    this.cfg = cfg;
    this.rebuild(cfg);
  }

  setAspect(aspect: number): void {
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    if (this.camera.aspect === aspect) return;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, elapsed: number, reducedMotion: boolean): void {
    const avatar = this.avatar;
    if (!avatar) return;

    if (reducedMotion) {
      this.applyStaticPose(avatar);
      return;
    }

    if (this.options.mode === "walk") {
      const motion = this.options.placementId
        ? getAvatarWalkMotion(this.options.placementId)
        : null;
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
    } else {
      const spin = this.options.mode === "orbit" ? this.orbitYaw : elapsed * 0.32;
      avatar.group.rotation.y = spin;
      avatar.group.rotation.z =
        this.options.mode === "idle" ? Math.sin(elapsed * 0.85) * 0.01 : 0;
      avatar.group.position.y =
        this.options.mode === "idle" ? Math.sin(elapsed * 1.2) * 0.004 : 0;
      avatar.parts.body.scale.y = 1 + Math.sin(elapsed * 1.55) * 0.01;
      avatar.parts.head.position.y =
        HEAD_BASE_Y + Math.sin(elapsed * 1.6 + 0.4) * 0.01;
      avatar.parts.head.rotation.y = Math.sin(elapsed * 0.5) * 0.05;
    }

    this.updateBlink(avatar, dt);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.avatar) {
      this.scene.remove(this.avatar.group);
      disposeAvatarGeometries(this.avatar.group, this.sharedMaterials);
      this.avatar = null;
    }
    if (this.floor) {
      this.floor.geometry.dispose();
      (this.floor.material as THREE.Material).dispose();
      this.floor = null;
    }
    disposeAvatarMaterials(this.materials);
  }

  private rebuild(cfg: AvatarConfig): void {
    if (this.avatar) {
      this.scene.remove(this.avatar.group);
      disposeAvatarGeometries(this.avatar.group, this.sharedMaterials);
    }
    const built = buildAvatar(THREE, cfg, this.materials);
    this.scene.add(built.group);
    this.avatar = built;
    this.blinkTimer = 2.5 + Math.random() * 2;
    this.blinkPhase = 0;
  }

  private applyStaticPose(avatar: AvatarBuildResult): void {
    const motion =
      this.options.mode === "walk" && this.options.placementId
        ? getAvatarWalkMotion(this.options.placementId)
        : null;
    avatar.group.rotation.x = 0;
    avatar.group.rotation.y =
      this.options.mode === "walk"
        ? motion?.headingY ?? 0
        : this.options.mode === "orbit"
          ? this.orbitYaw
          : 0.4;
    avatar.group.rotation.z = motion?.turnLean ?? 0;
    avatar.group.position.y = 0;
    avatar.parts.body.scale.y = 1;
    avatar.parts.head.position.y = HEAD_BASE_Y;
    avatar.parts.head.rotation.y = 0;
    avatar.parts.eyes.scale.y = 1;
  }

  private updateBlink(avatar: AvatarBuildResult, dt: number): void {
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0 && this.blinkPhase <= 0) {
      this.blinkPhase = 0.16;
      this.blinkTimer = 2.5 + Math.random() * 3.5;
    }
    if (this.blinkPhase > 0) {
      this.blinkPhase -= dt;
      const ph = Math.max(0, this.blinkPhase / 0.16);
      avatar.parts.eyes.scale.y = 0.12 + 0.88 * (Math.abs(ph - 0.5) * 2);
    } else {
      avatar.parts.eyes.scale.y = 1;
    }
  }
}
