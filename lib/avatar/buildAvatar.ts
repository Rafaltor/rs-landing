import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { BufferGeometry, Group, Mesh, MeshPhysicalMaterial } from "three";
import { buildPremiumDetails } from "./avatarEnhancements";
import type { AvatarMaterials } from "./avatarMaterials";
import { syncAvatarMaterials } from "./avatarMaterials";
import type { AvatarConfig } from "./palettes";
import { paletteIndex, SUIT } from "./palettes";
import {
  HAIR_CAP_R,
  HEAD_BASE_Y,
  HEAD_EAR_SCALE,
  HEAD_EAR_X,
  HEAD_SKULL,
  LIMBS,
  NECK,
  PELVIS,
  SHOE,
} from "./proportions";
import {
  chestTiltAt,
  chestZ,
  torsoRadiusAt,
  TORSO_PROFILES,
} from "./torsoProfile";
import type { ThreeNamespace } from "./types";

const EYE_SCALES: [number, number, number][] = [
  [0.066, 0.08, 0.045],
  [0.03, 0.034, 0.03],
  [0.078, 0.058, 0.045],
  [0.072, 0.062, 0.045],
  [0.072, 0.03, 0.045],
  [0.082, 0.094, 0.05],
  [0.072, 0.066, 0.045],
  [0.072, 0.066, 0.045],
  [0.09, 0.09, 0.052],
  [0.08, 0.044, 0.045],
];

const geoCache = new Map<string, BufferGeometry>();

function geo(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

function add(
  THREE: ThreeNamespace,
  parent: Group,
  geometry: BufferGeometry,
  material: MeshPhysicalMaterial,
  p?: [number, number, number],
  r?: [number, number, number],
  s?: number | [number, number, number],
  shadow = true,
  unique = false,
): Mesh {
  const m = new THREE.Mesh(geometry, material);
  if (p) m.position.set(p[0], p[1], p[2]);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  if (s !== undefined) {
    if (typeof s === "number") m.scale.setScalar(s);
    else m.scale.set(s[0], s[1], s[2]);
  }
  m.castShadow = shadow;
  m.receiveShadow = false;
  if (unique) m.userData.unique = true;
  parent.add(m);
  return m;
}

function sphere(THREE: ThreeNamespace): BufferGeometry {
  return geo("sphere", () => new THREE.SphereGeometry(1, 40, 28));
}

function capsule(THREE: ThreeNamespace, r: number, l: number): BufferGeometry {
  return geo(`cap${r}_${l}`, () => new THREE.CapsuleGeometry(r, l, 8, 24));
}

function rbox(
  THREE: ThreeNamespace,
  w: number,
  h: number,
  d: number,
  rad: number,
): BufferGeometry {
  return geo(
    `rb${w}_${h}_${d}_${rad}`,
    () => new RoundedBoxGeometry(w, h, d, 4, rad),
  );
}

function lapelMaterial(
  THREE: ThreeNamespace,
  cfg: AvatarConfig,
): MeshPhysicalMaterial {
  const suit = SUIT[paletteIndex(SUIT, cfg.suit)];
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(suit).multiplyScalar(0.88),
    roughness: 0.74,
    metalness: 0,
    clearcoat: 0.22,
    clearcoatRoughness: 0.42,
    sheen: 0.2,
    sheenRoughness: 0.8,
    envMapIntensity: 0.95,
  });
}

export type AvatarLimb = {
  shoulder?: Group;
  elbow?: Group;
  hip?: Group;
  knee?: Group;
  side: number;
};

export type AvatarParts = {
  body: Group;
  arms: AvatarLimb[];
  legs: AvatarLimb[];
  head: Group;
  eyes: Group;
  armR?: Group;
};

export type AvatarBuildResult = {
  group: Group;
  parts: AvatarParts;
};

function buildNose(
  THREE: ThreeNamespace,
  cfg: AvatarConfig,
  mat: AvatarMaterials,
  head: Group,
): void {
  const EYY = -0.22;
  const NZ = 0.4;
  const NY = EYY + 0.06;
  const nose = paletteIndex(
    [0, 1, 2, 3, 4, 5, 6] as const,
    cfg.nose,
  );

  switch (nose) {
    case 0:
      add(THREE, head, sphere(THREE), mat.skin, [0, NY - 0.06, NZ - 0.02], undefined, [
        0.05, 0.045, 0.05,
      ]);
      break;
    case 1:
      add(
        THREE,
        head,
        geo("noseTip", () => new THREE.ConeGeometry(0.045, 0.13, 14)),
        mat.skin,
        [0, NY - 0.06, NZ],
        [Math.PI * 0.5, 0, 0],
      );
      break;
    case 2:
      add(THREE, head, sphere(THREE), mat.skin, [0, NY - 0.06, NZ - 0.01], undefined, 0.062);
      break;
    case 3:
      add(THREE, head, sphere(THREE), mat.skin, [0, NY - 0.07, NZ], undefined, [
        0.05, 0.04, 0.06,
      ]);
      add(THREE, head, sphere(THREE), mat.skin, [0, NY - 0.04, NZ + 0.01], undefined, [
        0.035, 0.03, 0.04,
      ]);
      break;
    case 4:
      add(
        THREE,
        head,
        geo("noseBridge", () => new THREE.CapsuleGeometry(0.026, 0.1, 6, 14)),
        mat.skin,
        [0, NY - 0.03, NZ - 0.02],
        [0.55, 0, 0],
      );
      add(THREE, head, sphere(THREE), mat.skin, [0, NY - 0.1, NZ - 0.005], undefined, [
        0.045, 0.04, 0.05,
      ]);
      break;
    case 5:
      add(THREE, head, sphere(THREE), mat.skin, [0, NY - 0.06, NZ - 0.02], undefined, [
        0.075, 0.05, 0.055,
      ]);
      break;
    default:
      break;
  }
}

function buildEyes(
  THREE: ThreeNamespace,
  cfg: AvatarConfig,
  mat: AvatarMaterials,
  head: Group,
): Group {
  const EYX = 0.165;
  const EYY = -0.22;
  const EYZ = 0.38;
  const eyes = new THREE.Group();
  eyes.position.set(0, EYY, 0);
  head.add(eyes);

  const eyeStyle = paletteIndex(EYE_SCALES, cfg.eyes);
  const SC = EYE_SCALES[eyeStyle] ?? EYE_SCALES[0];
  const irisScale = eyeStyle === 1 ? 1.0 : 0.55;
  const tiltMap: Record<number, number> = { 6: 0.35, 7: -0.35, 9: -0.18 };
  const tilt = tiltMap[eyeStyle] ?? 0;

  for (const s of [-1, 1] as const) {
    if (eyeStyle === 1) {
      add(THREE, eyes, sphere(THREE), mat.eye, [s * EYX, 0, EYZ + 0.01], undefined, SC);
      continue;
    }
    const rot: [number, number, number] = [0, 0, s * tilt];
    add(THREE, eyes, sphere(THREE), mat.white, [s * EYX, 0, EYZ], rot, SC);
    add(
      THREE,
      eyes,
      sphere(THREE),
      mat.iris,
      [s * EYX, -SC[1] * 0.05, EYZ + 0.024],
      rot,
      [SC[0] * irisScale, SC[1] * irisScale, 0.027],
    );
    add(
      THREE,
      eyes,
      sphere(THREE),
      mat.eye,
      [s * EYX, -SC[1] * 0.05, EYZ + 0.034],
      rot,
      [SC[0] * irisScale * 0.42, SC[1] * irisScale * 0.42, 0.014],
      false,
    );
    add(
      THREE,
      eyes,
      sphere(THREE),
      mat.white,
      [s * EYX - s * 0.015, SC[1] * 0.3, EYZ + 0.045],
      undefined,
      0.01,
      false,
    );
    add(
      THREE,
      eyes,
      sphere(THREE),
      mat.white,
      [s * EYX + s * 0.01, SC[1] * 0.12, EYZ + 0.042],
      undefined,
      0.005,
      false,
    );
    if (eyeStyle === 3) {
      add(
        THREE,
        eyes,
        geo("lidA", () => new THREE.ConeGeometry(0.05, 0.05, 3)),
        mat.skin,
        [s * (EYX + 0.05), SC[1] * 0.4, EYZ + 0.01],
        [Math.PI * 0.5, 0, s * 0.6],
        [1, 1, 0.4],
      );
    }
    if (eyeStyle === 4 || eyeStyle === 9) {
      add(
        THREE,
        eyes,
        sphere(THREE),
        mat.skin,
        [s * EYX, SC[1] * 0.8, EYZ + 0.01],
        rot,
        [SC[0] * 1.2, SC[1] * 1.5, 0.05],
      );
    }
  }

  return eyes;
}

function buildHair(
  THREE: ThreeNamespace,
  cfg: AvatarConfig,
  mat: AvatarMaterials,
  head: Group,
): void {
  const m = mat.hair;
  const capFull = () =>
    new THREE.SphereGeometry(HAIR_CAP_R, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const capLow = () =>
    new THREE.SphereGeometry(
      HAIR_CAP_R,
      40,
      24,
      Math.PI * 0.83,
      Math.PI * 1.34,
      Math.PI * 0.42,
      Math.PI * 0.32,
    );

  const hair = paletteIndex(
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const,
    cfg.hair,
  );

  switch (hair) {
    case 0:
      add(THREE, head, geo("hairCap", capFull), m, [0, 0, 0], undefined, [1, 0.9, 1]);
      break;
    case 1:
      add(THREE, head, geo("hairCap", capFull), m, [0, 0.02, 0], [0, 0, 0], [1, 1.02, 1]);
      add(
        THREE,
        head,
        geo(
          "fringe",
          () =>
            new THREE.SphereGeometry(
              0.5,
              32,
              18,
              Math.PI * 1.05,
              Math.PI * 0.7,
              Math.PI * 0.3,
              Math.PI * 0.28,
            ),
        ),
        m,
        [0.06, 0.12, 0.02],
        [0.15, 0.25, 0],
        [1.02, 0.7, 1.04],
      );
      break;
    case 2: {
      add(THREE, head, geo("hairCap", capFull), m, [0, 0, 0], undefined, [1, 0.92, 1]);
      const sp = geo("spike", () => new THREE.ConeGeometry(0.07, 0.22, 12));
      add(THREE, head, sp, m, [0, 0.52, 0.02]);
      add(THREE, head, sp, m, [0.2, 0.46, 0.05], [0, 0, -0.5]);
      add(THREE, head, sp, m, [-0.2, 0.46, 0.05], [0, 0, 0.5]);
      add(THREE, head, sp, m, [0.1, 0.48, -0.18], [-0.4, 0, -0.25]);
      add(THREE, head, sp, m, [-0.1, 0.48, -0.18], [-0.4, 0, 0.25]);
      break;
    }
    case 3: {
      add(THREE, head, geo("hairCap", capFull), m, [0, 0.02, 0], undefined, [1.04, 1, 1.04]);
      const curl = sphere(THREE);
      const cpos: [number, number, number][] = [
        [0.32, 0.42, 0.18],
        [-0.32, 0.42, 0.18],
        [0, 0.5, 0.28],
        [0.34, 0.36, -0.18],
        [-0.34, 0.36, -0.18],
        [0.2, 0.5, -0.05],
        [-0.2, 0.5, -0.05],
        [0.4, 0.18, 0.05],
        [-0.4, 0.18, 0.05],
      ];
      for (const p of cpos) add(THREE, head, curl, m, p, undefined, 0.11);
      break;
    }
    case 4:
      add(THREE, head, geo("hairCap", capFull), m, [0, 0.02, 0], undefined, [1.02, 1.02, 1.02]);
      add(THREE, head, geo("hairCurt", capLow), m, [0, 0, 0], undefined, [1.05, 1.1, 1.05]);
      break;
    case 5:
      add(THREE, head, geo("hairCap", capFull), m, [0, 0.02, 0], undefined, [1.03, 1.03, 1.03]);
      add(THREE, head, geo("hairCurt", capLow), m, [0, 0, 0], undefined, [1.05, 1.05, 1.05]);
      add(
        THREE,
        head,
        geo("longBack", () => new THREE.CapsuleGeometry(0.26, 0.6, 8, 24)),
        m,
        [0, -0.55, -0.22],
        [0.12, 0, 0],
        [1.1, 1, 0.6],
      );
      break;
    case 6:
      add(THREE, head, geo("hairCap", capFull), m, [0, 0, 0], undefined, [1, 0.95, 1]);
      add(THREE, head, sphere(THREE), m, [0, 0.18, -0.46], undefined, 0.1);
      add(
        THREE,
        head,
        geo("tail", () => new THREE.CapsuleGeometry(0.1, 0.5, 8, 20)),
        m,
        [0, -0.18, -0.5],
        [0.35, 0, 0],
      );
      break;
    case 7:
      add(THREE, head, geo("hairCap", capFull), m, [0, 0, 0], undefined, [1, 0.95, 1]);
      add(THREE, head, sphere(THREE), m, [0, 0.5, -0.06], undefined, 0.15);
      break;
    case 8:
      add(THREE, head, geo("hairCap", capFull), m, [0, 0, 0], undefined, [1, 0.95, 1]);
      for (const s of [-1, 1] as const) {
        add(THREE, head, sphere(THREE), m, [s * 0.42, 0.12, -0.05], undefined, 0.1);
        add(
          THREE,
          head,
          geo("pig", () => new THREE.CapsuleGeometry(0.08, 0.34, 8, 18)),
          m,
          [s * 0.5, -0.18, -0.05],
          [0, 0, s * 0.5],
        );
      }
      break;
    case 9: {
      add(
        THREE,
        head,
        geo(
          "hairLow",
          () =>
            new THREE.SphereGeometry(
              HAIR_CAP_R,
              40,
              18,
              Math.PI * 0.83,
              Math.PI * 1.34,
              Math.PI * 0.52,
              Math.PI * 0.18,
            ),
        ),
        m,
        [0, 0, 0],
      );
      const sp = geo("spike", () => new THREE.ConeGeometry(0.07, 0.22, 12));
      for (let i = -2; i <= 2; i += 1) {
        add(THREE, head, sp, m, [0, 0.48, i * 0.12], [i * 0.05, 0, 0], [1, 1.4, 1]);
      }
      break;
    }
    case 10:
      add(
        THREE,
        head,
        geo(
          "afro",
          () =>
            new THREE.SphereGeometry(0.62, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.72),
        ),
        m,
        [0, 0.06, 0],
        undefined,
        [1.08, 1.05, 1.08],
      );
      break;
    case 11:
      add(
        THREE,
        head,
        geo(
          "hairLowB",
          () =>
            new THREE.SphereGeometry(
              HAIR_CAP_R,
              40,
              18,
              Math.PI * 0.83,
              Math.PI * 1.34,
              Math.PI * 0.52,
              Math.PI * 0.16,
            ),
        ),
        m,
        [0, 0, 0],
        undefined,
        [1.02, 1, 1.02],
      );
      add(THREE, head, sphere(THREE), m, [0.47, -0.02, 0], undefined, [0.05, 0.1, 0.1]);
      add(THREE, head, sphere(THREE), m, [-0.47, -0.02, 0], undefined, [0.05, 0.1, 0.1]);
      break;
    default:
      break;
  }
}

function buildGlasses(
  THREE: ThreeNamespace,
  mat: AvatarMaterials,
  head: Group,
): void {
  const lensGeo = geo(
    "lensFrame",
    () => new THREE.TorusGeometry(0.115, 0.016, 12, 32),
  );
  const EYX = 0.17;
  const EYZ = 0.47;
  for (const s of [-1, 1] as const) {
    add(THREE, head, lensGeo, mat.frame, [s * EYX, -0.22, EYZ]);
    add(
      THREE,
      head,
      geo("lensGlass", () => new THREE.CircleGeometry(0.108, 28)),
      mat.lens,
      [s * EYX, -0.22, EYZ - 0.002],
      undefined,
      1,
      false,
    );
  }
  add(THREE, head, rbox(THREE, 0.07, 0.02, 0.02, 0.008), mat.frame, [0, -0.21, EYZ]);
  add(THREE, head, rbox(THREE, 0.42, 0.018, 0.018, 0.008), mat.frame, [0.34, -0.2, 0.2], [
    0, 1.05, 0,
  ]);
  add(THREE, head, rbox(THREE, 0.42, 0.018, 0.018, 0.008), mat.frame, [-0.34, -0.2, 0.2], [
    0, -1.05, 0,
  ]);
}

function buildLeg(
  THREE: ThreeNamespace,
  mat: AvatarMaterials,
  body: Group,
  side: -1 | 1,
  bodyIdx: number,
  legSep: number,
): AvatarLimb {
  const hipY = LIMBS.hipY;
  const hip = new THREE.Group();
  hip.position.set(side * legSep, hipY, 0.015);
  body.add(hip);

  add(THREE, hip, sphere(THREE), mat.pants, [0, 0.025, 0], undefined, LIMBS.hipBridge);

  const { thighLen, thighR, calfLen, calfR } = LIMBS;
  add(THREE, hip, capsule(THREE, thighR, thighLen), mat.pants, [
    0, -(thighLen / 2 + thighR) + 0.03, 0,
  ]);

  const knee = new THREE.Group();
  knee.position.y = -(thighLen + thighR * 1.85);
  hip.add(knee);

  add(THREE, knee, sphere(THREE), mat.pants, [0, 0.012, -0.005], undefined, LIMBS.kneeBridge);

  add(THREE, knee, capsule(THREE, calfR, calfLen), mat.pants, [
    0, -(calfLen / 2 + calfR) + 0.015, -0.008,
  ]);

  const footY = -(calfLen + calfR * 1.9) - 0.015;
  const shoe = new THREE.Group();
  shoe.position.set(0, footY, 0);
  knee.add(shoe);

  add(THREE, shoe, rbox(THREE, SHOE.soleW, SHOE.soleH, SHOE.soleD, 0.02), mat.dark, [0, 0, 0.06]);
  add(
    THREE,
    shoe,
    geo(
      "shoeUpper",
      () =>
        new THREE.SphereGeometry(0.115, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
    ),
    mat.shoe,
    [0, 0.025, -0.02],
    undefined,
    [0.82, 1, 1.55],
  );
  add(THREE, shoe, sphere(THREE), mat.shoe, [0, 0.045, 0.16], undefined, [
    0.1, 0.075, 0.085,
  ]);

  return { hip, knee, side };
}

function buildArm(
  THREE: ThreeNamespace,
  mat: AvatarMaterials,
  body: Group,
  bodyIdx: number,
  side: -1 | 1,
): { limb: AvatarLimb; shoulder: Group } {
  const shoulderY = 1.48;
  const torsoR = torsoRadiusAt(bodyIdx, shoulderY);
  const shoulderX = side * (torsoR + 0.01);

  add(THREE, body, sphere(THREE), mat.suit, [shoulderX * 0.97, shoulderY, -0.018], undefined, LIMBS.shoulderPad);

  const shoulder = new THREE.Group();
  shoulder.position.set(shoulderX, shoulderY, -0.014);
  body.add(shoulder);

  const { upLen, upR, foreLen, foreR } = LIMBS;
  add(THREE, shoulder, capsule(THREE, upR, upLen), mat.suit, [
    0, -(upLen / 2 + upR) + 0.022, 0.005,
  ]);

  const elbow = new THREE.Group();
  elbow.position.y = -(upLen + upR * 1.88);
  shoulder.add(elbow);

  add(THREE, elbow, sphere(THREE), mat.suit, [0, 0.01, 0], undefined, LIMBS.elbowBridge);
  add(THREE, elbow, capsule(THREE, foreR, foreLen), mat.suit, [
    0, -(foreLen / 2 + foreR) + 0.012, 0,
  ]);
  add(
    THREE,
    elbow,
    geo("cuff", () => new THREE.CylinderGeometry(foreR * 1.06, foreR * 1.06, 0.035, 16)),
    mat.white,
    [0, -(foreLen + foreR * 1.55), 0],
  );

  if (side === -1) {
    const watchY = -(foreLen + foreR * 1.55) - 0.008;
    add(THREE, elbow, rbox(THREE, 0.052, 0.016, 0.024, 0.005), mat.metal, [
      0, watchY, foreR * 0.95,
    ]);
    add(THREE, elbow, rbox(THREE, 0.038, 0.01, 0.006, 0.003), mat.dark, [
      0, watchY, foreR * 1.1,
    ]);
  }

  const handY = -(foreLen + foreR * 1.88) - 0.01;
  const hand = new THREE.Group();
  hand.position.y = handY;
  elbow.add(hand);
  add(THREE, hand, sphere(THREE), mat.skin, [0, 0, 0], undefined, [0.056, 0.082, 0.038]);
  add(THREE, hand, sphere(THREE), mat.skin, [side * 0.035, 0.014, 0.006], undefined, [
    0.02, 0.032, 0.018,
  ]);

  shoulder.rotation.z = side * 0.1;
  elbow.rotation.x = 0.07;

  return { limb: { shoulder, elbow, side }, shoulder };
}

/** Construit un Corporate Mii procédural (port fidèle de mii-corporate-3d.html). */
export function buildAvatar(
  THREE: ThreeNamespace,
  cfg: AvatarConfig,
  materials: AvatarMaterials,
): AvatarBuildResult {
  syncAvatarMaterials(THREE, cfg, materials);

  const avatar = new THREE.Group();
  avatar.name = "avatar";

  const body = new THREE.Group();
  avatar.add(body);

  const bodyIdx = paletteIndex([0, 1] as const, cfg.body);
  const profPoints = (TORSO_PROFILES[bodyIdx] ?? TORSO_PROFILES[0]).map(
    (p) => new THREE.Vector2(p[0], p[1]),
  );
  const torsoGeo = new THREE.LatheGeometry(profPoints, 72);
  torsoGeo.computeVertexNormals();
  const torso = new THREE.Mesh(torsoGeo, materials.suit);
  torso.castShadow = true;
  torso.userData.unique = true;
  body.add(torso);

  const front = new THREE.Group();
  body.add(front);

  const shirtY = 1.28;
  const shirtTilt = chestTiltAt(bodyIdx, shirtY);
  const shirtShape = new THREE.Shape();
  shirtShape.moveTo(0, 0.16);
  shirtShape.lineTo(0.14, -0.02);
  shirtShape.lineTo(0, -0.3);
  shirtShape.lineTo(-0.14, -0.02);
  shirtShape.lineTo(0, 0.16);
  const shirtGeo = new THREE.ShapeGeometry(shirtShape);
  add(
    THREE,
    front,
    shirtGeo,
    materials.shirt,
    [0, shirtY, chestZ(bodyIdx, shirtY, 0.008)],
    [shirtTilt, 0, 0],
    1,
    false,
    true,
  );

  const colY = 1.45;
  const colZ = chestZ(bodyIdx, colY, 0.03);
  const colTilt = chestTiltAt(bodyIdx, colY);
  const colX = torsoRadiusAt(bodyIdx, colY) * 0.2;
  add(THREE, front, rbox(THREE, 0.11, 0.045, 0.028, 0.015), materials.white, [
    colX, colY, colZ,
  ], [colTilt, 0, -0.48]);
  add(THREE, front, rbox(THREE, 0.11, 0.045, 0.028, 0.015), materials.white, [
    -colX, colY, colZ,
  ], [colTilt, 0, 0.48]);

  const lapelY = 1.29;
  const lapelZ = chestZ(bodyIdx, lapelY, 0.028);
  const lapelTilt = chestTiltAt(bodyIdx, lapelY);
  const lapelX = torsoRadiusAt(bodyIdx, lapelY) * 0.36;
  const lapel = lapelMaterial(THREE, cfg);
  add(THREE, front, rbox(THREE, 0.1, 0.34, 0.028, 0.018), lapel, [
    lapelX, lapelY, lapelZ,
  ], [lapelTilt, 0, -0.32]);
  add(THREE, front, rbox(THREE, 0.1, 0.34, 0.028, 0.018), lapel, [
    -lapelX, lapelY, lapelZ,
  ], [lapelTilt, 0, 0.32]);

  const acc = paletteIndex([0, 1, 2, 3] as const, cfg.acc);
  if (acc === 0) {
    const tieTopY = 1.43;
    const tieZ = chestZ(bodyIdx, tieTopY, 0.035);
    const tieTilt = chestTiltAt(bodyIdx, tieTopY);
    add(THREE, front, rbox(THREE, 0.065, 0.08, 0.028, 0.015), materials.acc, [
      0, tieTopY, tieZ,
    ], [tieTilt, 0, 0]);
    add(THREE, front, sphere(THREE), materials.acc, [0, 1.47, chestZ(bodyIdx, 1.47, 0.03)], undefined, 0.03);
    add(
      THREE,
      front,
      geo("tieBlade", () => new THREE.ConeGeometry(0.055, 0.34, 8)),
      materials.acc,
      [0, 1.2, chestZ(bodyIdx, 1.2, 0.02)],
      [Math.PI - 0.3 + tieTilt, Math.PI / 4, 0],
      [1, 1, 0.4],
    );
  } else if (acc === 1) {
    const bowY = 1.45;
    const bowZ = chestZ(bodyIdx, bowY, 0.03);
    const bowTilt = chestTiltAt(bodyIdx, bowY);
    const bc = geo("bow", () => new THREE.ConeGeometry(0.05, 0.1, 14));
    add(THREE, front, bc, materials.acc, [-0.08, bowY, bowZ], [bowTilt, 0, -Math.PI / 2], [
      1, 1, 0.42,
    ]);
    add(THREE, front, bc, materials.acc, [0.08, bowY, bowZ], [bowTilt, 0, Math.PI / 2], [
      1, 1, 0.42,
    ]);
    add(THREE, front, sphere(THREE), materials.acc, [0, bowY + 0.01, bowZ], undefined, 0.028);
  } else if (acc === 2) {
    const badgeY = 1.12;
    const badgeZ = chestZ(bodyIdx, badgeY, 0.02);
    const badgeTilt = chestTiltAt(bodyIdx, badgeY);
    add(THREE, front, rbox(THREE, 0.014, 0.28, 0.014, 0.005), materials.acc, [
      0.08, 1.32, chestZ(bodyIdx, 1.32, 0.014),
    ], [chestTiltAt(bodyIdx, 1.32), 0, -0.48]);
    add(THREE, front, rbox(THREE, 0.014, 0.28, 0.014, 0.005), materials.acc, [
      -0.02, 1.3, chestZ(bodyIdx, 1.3, 0.014),
    ], [chestTiltAt(bodyIdx, 1.3), 0, 0.34]);
    add(THREE, front, rbox(THREE, 0.15, 0.19, 0.018, 0.015), materials.white, [
      0.04, badgeY, badgeZ,
    ], [badgeTilt, 0, 0]);
    add(THREE, front, rbox(THREE, 0.09, 0.028, 0.018, 0.008), materials.acc, [
      0.04, badgeY + 0.06, chestZ(bodyIdx, badgeY + 0.06, 0.018),
    ], [badgeTilt, 0, 0]);
    add(THREE, front, rbox(THREE, 0.08, 0.018, 0.018, 0.006), materials.dark, [
      0.04, badgeY - 0.03, chestZ(bodyIdx, badgeY - 0.03, 0.018),
    ], [badgeTilt, 0, 0]);
  }

  const beltY = 1.02;
  const beltR = torsoRadiusAt(bodyIdx, beltY) * 0.96;
  add(
    THREE,
    body,
    geo("belt", () => new THREE.TorusGeometry(beltR, 0.022, 10, 44)),
    materials.dark,
    [0, beltY, 0],
    [Math.PI / 2, 0, 0],
    [1, 1, 0.92],
  );
  add(THREE, body, rbox(THREE, 0.075, 0.055, 0.03, 0.012), materials.metal, [
    0, beltY, beltR * 0.95,
  ]);

  const pelvisY = PELVIS.y;
  const pelvisScale = cfg.body === 1 ? PELVIS.scale.femme : PELVIS.scale.homme;
  add(
    THREE,
    body,
    geo("pelvis", () => new THREE.SphereGeometry(1, 32, 24)),
    materials.pants,
    [0, pelvisY, 0.01],
    undefined,
    [...pelvisScale],
  );

  const legSep = cfg.body === 1 ? LIMBS.legSep.femme : LIMBS.legSep.homme;
  const legs = [
    buildLeg(THREE, materials, body, -1, bodyIdx, legSep),
    buildLeg(THREE, materials, body, 1, bodyIdx, legSep),
  ];

  const arms: AvatarLimb[] = [];
  let armR: Group | undefined;
  for (const side of [-1, 1] as const) {
    const { limb, shoulder } = buildArm(THREE, materials, body, bodyIdx, side);
    arms.push(limb);
    if (side === 1) armR = shoulder;
  }

  add(
    THREE,
    avatar,
    capsule(THREE, NECK.radius, NECK.length),
    materials.skin,
    [0, NECK.y, 0],
  );

  const head = new THREE.Group();
  head.position.set(0, HEAD_BASE_Y, 0);
  head.name = "head-pivot";
  avatar.add(head);

  add(THREE, head, sphere(THREE), materials.skin, [0, 0, 0], undefined, HEAD_SKULL);
  add(THREE, head, sphere(THREE), materials.skin, [HEAD_EAR_X, -0.02, 0], undefined, HEAD_EAR_SCALE);
  add(THREE, head, sphere(THREE), materials.skin, [-HEAD_EAR_X, -0.02, 0], undefined, HEAD_EAR_SCALE);

  buildNose(THREE, cfg, materials, head);
  const eyes = buildEyes(THREE, cfg, materials, head);
  buildHair(THREE, cfg, materials, head);

  if (cfg.glasses) buildGlasses(THREE, materials, head);

  buildPremiumDetails(THREE, cfg, materials, bodyIdx, body, front, head, add, {
    sphere,
    rbox,
    capsule,
  });

  return {
    group: avatar,
    parts: { body, arms, legs, head, eyes, armR },
  };
}
