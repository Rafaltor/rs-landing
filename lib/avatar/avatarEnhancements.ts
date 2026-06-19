import type { Group } from "three";
import type { AvatarMaterials } from "./avatarMaterials";
import type { AvatarConfig } from "./palettes";
import { paletteIndex, ACCC } from "./palettes";
import { chestTiltAt, chestZ, torsoRadiusAt } from "./torsoProfile";
import type { ThreeNamespace } from "./types";

type AddFn = (
  THREE: ThreeNamespace,
  parent: Group,
  geometry: import("three").BufferGeometry,
  material: import("three").MeshPhysicalMaterial,
  p?: [number, number, number],
  r?: [number, number, number],
  s?: number | [number, number, number],
  shadow?: boolean,
) => void;

/** Détails visuels premium : costume, visage — calés sur le profil du torse. */
export function buildPremiumDetails(
  THREE: ThreeNamespace,
  cfg: AvatarConfig,
  mat: AvatarMaterials,
  bodyIdx: number,
  body: Group,
  front: Group,
  head: Group,
  add: AddFn,
  helpers: {
    sphere: (THREE: ThreeNamespace) => import("three").BufferGeometry;
    rbox: (
      THREE: ThreeNamespace,
      w: number,
      h: number,
      d: number,
      rad: number,
    ) => import("three").BufferGeometry;
    capsule: (
      THREE: ThreeNamespace,
      r: number,
      l: number,
    ) => import("three").BufferGeometry;
  },
): void {
  buildSuitDetails(THREE, cfg, mat, bodyIdx, front, add, helpers);
  buildFaceDetails(THREE, mat, head, add, helpers);
}

function buildSuitDetails(
  THREE: ThreeNamespace,
  cfg: AvatarConfig,
  mat: AvatarMaterials,
  bodyIdx: number,
  front: Group,
  add: AddFn,
  helpers: {
    sphere: (THREE: ThreeNamespace) => import("three").BufferGeometry;
    rbox: (
      THREE: ThreeNamespace,
      w: number,
      h: number,
      d: number,
      rad: number,
    ) => import("three").BufferGeometry;
  },
): void {
  const buttonY = [1.4, 1.3, 1.2];
  for (const y of buttonY) {
    const z = chestZ(bodyIdx, y, 0.012);
    const tilt = chestTiltAt(bodyIdx, y);
    add(THREE, front, helpers.sphere(THREE), mat.metal, [0, y, z], undefined, 0.015, false);
    add(
      THREE,
      front,
      helpers.rbox(THREE, 0.006, 0.006, 0.003, 0.001),
      mat.metal,
      [0, y, z + 0.004],
      [tilt, 0, 0],
      1,
      false,
    );
  }

  const pocketY = 1.28;
  const pocketX = -torsoRadiusAt(bodyIdx, pocketY) * 0.52;
  const pocketZ = chestZ(bodyIdx, pocketY, 0.012);
  const pocketTilt = chestTiltAt(bodyIdx, pocketY);
  add(
    THREE,
    front,
    helpers.rbox(THREE, 0.12, 0.1, 0.01, 0.006),
    mat.suit,
    [pocketX, pocketY, pocketZ],
    [pocketTilt, 0, 0.06],
  );

  const accent = ACCC[paletteIndex(ACCC, cfg.accColor)];
  const pocketSquare = new THREE.MeshPhysicalMaterial({
    color: accent,
    roughness: 0.62,
    metalness: 0,
    sheen: 0.35,
    sheenRoughness: 0.55,
    clearcoat: 0.15,
    envMapIntensity: 0.85,
  });
  add(
    THREE,
    front,
    helpers.rbox(THREE, 0.08, 0.06, 0.008, 0.004),
    pocketSquare,
    [pocketX, pocketY + 0.02, chestZ(bodyIdx, pocketY + 0.02, 0.008)],
    [pocketTilt, 0, 0.28],
  );

  const seamY = 1.08;
  add(
    THREE,
    front,
    helpers.rbox(THREE, 0.004, 0.5, 0.006, 0.001),
    mat.dark,
    [0, seamY, chestZ(bodyIdx, seamY, 0.006)],
    [chestTiltAt(bodyIdx, seamY), 0, 0],
    1,
    false,
  );
}

function buildFaceDetails(
  THREE: ThreeNamespace,
  mat: AvatarMaterials,
  head: Group,
  add: AddFn,
  helpers: {
    sphere: (THREE: ThreeNamespace) => import("three").BufferGeometry;
    capsule: (
      THREE: ThreeNamespace,
      r: number,
      l: number,
    ) => import("three").BufferGeometry;
  },
): void {
  const cheekY = -0.14;
  const cheekZ = 0.36;
  for (const side of [-1, 1] as const) {
    add(
      THREE,
      head,
      helpers.sphere(THREE),
      mat.blush,
      [side * 0.22, cheekY, cheekZ],
      [0, side * 0.15, 0],
      [0.09, 0.06, 0.04],
      false,
    );
  }

  const browY = 0.06;
  const browZ = 0.38;
  for (const side of [-1, 1] as const) {
    add(
      THREE,
      head,
      helpers.capsule(THREE, 0.012, 0.055),
      mat.brow,
      [side * 0.17, browY, browZ],
      [0.1, 0, side * 0.35],
      [1, 1, 0.85],
      false,
    );
  }

  add(
    THREE,
    head,
    helpers.sphere(THREE),
    mat.skin,
    [0, -0.28, 0.32],
    [0.25, 0, 0],
    [0.14, 0.1, 0.12],
    false,
  );
}
