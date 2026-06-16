import * as THREE from "three";

/** Ombre de contact douce sous les pieds (style studio photo). */
export function createContactShadowMesh(): THREE.Mesh {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      6,
      size / 2,
      size / 2,
      size / 2,
    );
    g.addColorStop(0, "rgba(18,28,38,0.48)");
    g.addColorStop(0.45, "rgba(18,28,38,0.22)");
    g.addColorStop(0.72, "rgba(18,28,38,0.06)");
    g.addColorStop(1, "rgba(18,28,38,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.35, 1.65),
    new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      opacity: 0.92,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.014;
  mesh.renderOrder = -1;
  return mesh;
}
