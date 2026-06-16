import type { Material, Mesh, Object3D } from "three";

/** Libère les géométries uniques d'un groupe avatar (cache partagé conservé). */
export function disposeAvatarGeometries(
  root: Object3D,
  sharedMaterials: ReadonlySet<Material>,
): void {
  root.traverse((child) => {
    if (!isMesh(child)) return;
    if (child.geometry && child.userData.unique === true) {
      child.geometry.dispose();
    }
    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const mat of mats) {
      if (!sharedMaterials.has(mat)) {
        mat.dispose();
      }
    }
  });
}

function isMesh(obj: Object3D): obj is Mesh {
  return (obj as Mesh).isMesh === true;
}
