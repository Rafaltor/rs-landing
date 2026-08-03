/** Repositionne un hotspot comme Pannellum (Ca) sans relancer le moteur 3D. */
export function layoutPannellumHotspot(
  hotspot: PannellumHotSpot & { div?: HTMLElement; scale?: boolean },
  viewer: PannellumViewer,
  rollDeg = 0,
  divOverride?: HTMLElement,
  sizeScale = 1,
): void {
  const div = divOverride ?? hotspot.div;
  if (!div) return;

  const pitch = viewer.getPitch?.() ?? 0;
  const yaw = viewer.getYaw?.() ?? 0;
  const hfov = viewer.getHfov?.() ?? 100;
  const canvas = viewer.getCanvas?.();
  const container = viewer.getContainer?.();
  const width = canvas?.clientWidth || container?.clientWidth || 0;
  const height = canvas?.clientHeight || container?.clientHeight || 0;
  if (width === 0 || height === 0) return;

  const hsPitch = hotspot.pitch;
  const hsYaw = hotspot.yaw;

  const sinHp = Math.sin((hsPitch * Math.PI) / 180);
  const cosHp = Math.cos((hsPitch * Math.PI) / 180);
  const sinVp = Math.sin((pitch * Math.PI) / 180);
  const cosVp = Math.cos((pitch * Math.PI) / 180);
  const cosDelta = Math.cos(((-hsYaw + yaw) * Math.PI) / 180);
  const h = sinHp * sinVp + cosHp * cosDelta * cosVp;

  const behind =
    (hsYaw <= 90 && hsYaw > -90 && h <= 0) ||
    ((hsYaw > 90 || hsYaw <= -90) && h <= 0);

  if (behind) {
    div.style.visibility = "hidden";
    return;
  }

  const sinDelta = Math.sin(((-hsYaw + yaw) * Math.PI) / 180);
  const k = Math.tan((hfov * Math.PI) / 360);

  let tx = (-width / k) * ((sinDelta * cosHp) / h) * 0.5;
  let ty =
    (-width / k) * ((sinHp * cosVp - cosHp * cosDelta * sinVp) / h) * 0.5;

  const roll = (rollDeg * Math.PI) / 180;
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  const rx = tx * cosR - ty * sinR;
  const ry = tx * sinR + ty * cosR;
  tx = rx + (width - div.offsetWidth) / 2;
  ty = ry + (height - div.offsetHeight) / 2;

  let transform = `translate3d(${tx}px, ${ty}px, 9999px) rotate(${rollDeg}deg)`;
  if (hotspot.scale) {
    transform += ` scale(${hfov / h})`;
  }
  if (sizeScale !== 1) {
    transform += ` scale(${sizeScale})`;
  }

  div.style.visibility = "visible";
  div.style.transform = transform;
  div.style.webkitTransform = transform;
}
