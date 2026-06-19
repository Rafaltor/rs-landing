import type { Color, MeshPhysicalMaterial } from "three";
import type { ThreeNamespace } from "./types";
import type { AvatarConfig } from "./palettes";
import {
  ACCC,
  HAIRC,
  paletteIndex,
  SHIRT,
  SKIN,
  SUIT,
} from "./palettes";

const IRIS_TONES = [
  0x3d5a80, 0x4a6741, 0x6b4c35, 0x2c5282, 0x553c2a, 0x5c4a72, 0x3f6f8f,
] as const;

export type AvatarMaterials = {
  skin: MeshPhysicalMaterial;
  hair: MeshPhysicalMaterial;
  suit: MeshPhysicalMaterial;
  pants: MeshPhysicalMaterial;
  shirt: MeshPhysicalMaterial;
  acc: MeshPhysicalMaterial;
  dark: MeshPhysicalMaterial;
  eye: MeshPhysicalMaterial;
  iris: MeshPhysicalMaterial;
  white: MeshPhysicalMaterial;
  frame: MeshPhysicalMaterial;
  lens: MeshPhysicalMaterial;
  shoe: MeshPhysicalMaterial;
  metal: MeshPhysicalMaterial;
  brow: MeshPhysicalMaterial;
  blush: MeshPhysicalMaterial;
};

function physical(
  THREE: ThreeNamespace,
  color: number | Color,
  opts: Partial<MeshPhysicalMaterial> = {},
): MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: color instanceof THREE.Color ? color : new THREE.Color(color),
    roughness: 0.62,
    metalness: 0,
    clearcoat: 0.22,
    clearcoatRoughness: 0.45,
    envMapIntensity: 0.95,
    ...opts,
  });
}

export function createAvatarMaterials(THREE: ThreeNamespace): AvatarMaterials {
  const skin = physical(THREE, SKIN[1], {
    roughness: 0.48,
    clearcoat: 0.38,
    clearcoatRoughness: 0.28,
    sheen: 0.42,
    sheenRoughness: 0.62,
    sheenColor: new THREE.Color(0xffd4bc),
    envMapIntensity: 1.05,
  });

  const hair = physical(THREE, HAIRC[1], {
    roughness: 0.38,
    clearcoat: 0.42,
    clearcoatRoughness: 0.28,
    sheen: 0.18,
    sheenRoughness: 0.75,
    envMapIntensity: 1,
  });

  const suit = physical(THREE, SUIT[0], {
    roughness: 0.72,
    clearcoat: 0.18,
    clearcoatRoughness: 0.48,
    sheen: 0.28,
    sheenRoughness: 0.82,
    sheenColor: new THREE.Color(0xc8d0d8),
    envMapIntensity: 0.92,
  });

  return {
    skin,
    hair,
    suit,
    pants: physical(THREE, SUIT[0], {
      roughness: 0.82,
      clearcoat: 0.08,
      clearcoatRoughness: 0.65,
      envMapIntensity: 0.75,
    }),
    shirt: physical(THREE, SHIRT[0], {
      roughness: 0.48,
      clearcoat: 0.22,
      clearcoatRoughness: 0.35,
      sheen: 0.12,
      sheenRoughness: 0.7,
      envMapIntensity: 1,
    }),
    acc: physical(THREE, ACCC[1], {
      roughness: 0.42,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3,
      envMapIntensity: 1,
    }),
    dark: physical(THREE, 0x1e2328, {
      roughness: 0.45,
      clearcoat: 0.3,
      clearcoatRoughness: 0.35,
    }),
    iris: physical(THREE, IRIS_TONES[0], {
      roughness: 0.22,
      clearcoat: 0.55,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.1,
    }),
    eye: physical(THREE, 0x14100e, {
      roughness: 0.18,
      clearcoat: 0.6,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.15,
    }),
    white: physical(THREE, 0xfefeff, {
      roughness: 0.22,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.1,
    }),
    frame: new THREE.MeshPhysicalMaterial({
      color: 0x1f2429,
      roughness: 0.22,
      metalness: 0.45,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.15,
    }),
    lens: new THREE.MeshPhysicalMaterial({
      color: 0xd4ecf8,
      roughness: 0.04,
      metalness: 0,
      transmission: 0.88,
      thickness: 0.25,
      ior: 1.45,
      transparent: true,
      opacity: 0.55,
      envMapIntensity: 1.35,
    }),
    shoe: physical(THREE, 0x1a1f24, {
      roughness: 0.28,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1,
    }),
    metal: new THREE.MeshPhysicalMaterial({
      color: 0xd4dae0,
      roughness: 0.18,
      metalness: 0.92,
      clearcoat: 0.4,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.25,
    }),
    brow: physical(THREE, HAIRC[1], {
      roughness: 0.55,
      clearcoat: 0.2,
      sheen: 0.15,
      envMapIntensity: 0.85,
    }),
    blush: physical(THREE, SKIN[1], {
      roughness: 0.65,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xffb8a0),
      envMapIntensity: 0.6,
    }),
  };
}

export function syncAvatarMaterials(
  THREE: ThreeNamespace,
  cfg: AvatarConfig,
  mat: AvatarMaterials,
): void {
  const skin = cfg.skin;
  const hair = cfg.hairColor;
  const suit = cfg.suit;
  const pants = cfg.pants;
  const shirt = cfg.shirt;
  const acc = cfg.accColor;
  const iris = IRIS_TONES[paletteIndex(IRIS_TONES, cfg.eyes)];

  mat.skin.color.setHex(skin);
  mat.blush.color.setHex(skin);
  mat.blush.sheenColor = new THREE.Color(skin).multiplyScalar(1.08);

  mat.hair.color.setHex(hair);
  mat.brow.color.copy(new THREE.Color(hair).multiplyScalar(0.72));

  mat.suit.color.setHex(suit);
  mat.suit.sheenColor = new THREE.Color(suit).lerp(new THREE.Color(0xffffff), 0.22);

  mat.pants.color.setHex(pants);

  mat.shirt.color.setHex(shirt);
  mat.acc.color.setHex(acc);
  mat.iris.color.setHex(iris);
}

export function disposeAvatarMaterials(materials: AvatarMaterials): void {
  for (const mat of Object.values(materials)) {
    mat.dispose();
  }
}
