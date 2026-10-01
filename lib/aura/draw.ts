import { BONES, PICTO_LEAD } from "./config";
import { sampleAt, type Landmark, type Sample } from "./pose";

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[] | null,
  w: number,
  h: number,
  color: string,
) {
  ctx.clearRect(0, 0, w, h);
  if (!lm) return;
  ctx.lineWidth = Math.max(4, w / 120);
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  for (const [a, b] of BONES) {
    if ((lm[a]?.visibility ?? 1) < 0.5 || (lm[b]?.visibility ?? 1) < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(lm[a].x * w, lm[a].y * h);
    ctx.lineTo(lm[b].x * w, lm[b].y * h);
    ctx.stroke();
  }
}

function box(lm: Landmark[]) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const [a, b] of BONES) {
    for (const i of [a, b]) {
      if ((lm[i]?.visibility ?? 1) < 0.5) continue;
      minX = Math.min(minX, lm[i].x);
      minY = Math.min(minY, lm[i].y);
      maxX = Math.max(maxX, lm[i].x);
      maxY = Math.max(maxY, lm[i].y);
    }
  }
  if (maxX <= minX) return { minX: 0.2, minY: 0.1, maxX: 0.8, maxY: 0.95 };
  return { minX, minY, maxX, maxY };
}

export function drawPicto(
  canvas: HTMLCanvasElement,
  samples: Sample[],
  t: number,
  mirror: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const s = sampleAt(samples, t + PICTO_LEAD);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!s?.lm || s.t < t - 0.05) return false;
  const { minX, minY, maxX, maxY } = box(s.lm);
  const pad = 0.08;
  const bw = maxX - minX || 0.4;
  const bh = maxY - minY || 0.8;
  const scale = Math.min((1 - 2 * pad) / bw, (1 - 2 * pad) / bh);
  const ox = (1 - bw * scale) / 2 - minX * scale;
  const oy = (1 - bh * scale) / 2 - minY * scale;
  const mapX = (x: number) => {
    const nx = (x * scale + ox) * canvas.width;
    return mirror ? canvas.width - nx : nx;
  };
  const mapY = (y: number) => (y * scale + oy) * canvas.height;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#FFFFFF";
  for (const [a, b] of BONES) {
    if ((s.lm[a]?.visibility ?? 1) < 0.5 || (s.lm[b]?.visibility ?? 1) < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(mapX(s.lm[a].x), mapY(s.lm[a].y));
    ctx.lineTo(mapX(s.lm[b].x), mapY(s.lm[b].y));
    ctx.stroke();
  }
  return true;
}

export function drawModel(canvas: HTMLCanvasElement, samples: Sample[], t: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const s = sampleAt(samples, t);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!s?.lm) return;
  drawSkeleton(ctx, s.lm, canvas.width, canvas.height, "#FF1A1A");
}
