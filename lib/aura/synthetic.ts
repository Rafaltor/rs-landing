import { JOINTS, SYNTHETIC_DURATION } from "./config";
import { angles, type Landmark, type Sample } from "./pose";

function at(x: number, y: number, vis = 1): Landmark {
  return { x, y, visibility: vis };
}

function dancer(t: number): Landmark[] {
  const s = Math.sin(t * Math.PI * 2);
  const c = Math.cos(t * Math.PI * 1.5);
  const lm: Landmark[] = Array.from({ length: 33 }, () => at(0.5, 0.5, 0));
  lm[11] = at(0.4, 0.28);
  lm[12] = at(0.6, 0.28);
  lm[13] = at(0.28 + 0.06 * s, 0.42);
  lm[14] = at(0.72 - 0.06 * s, 0.42);
  lm[15] = at(0.22 + 0.12 * s, 0.28 + 0.18 * c);
  lm[16] = at(0.78 - 0.12 * s, 0.28 - 0.18 * c);
  lm[23] = at(0.44, 0.52);
  lm[24] = at(0.56, 0.52);
  lm[25] = at(0.43, 0.72);
  lm[26] = at(0.57, 0.72);
  lm[27] = at(0.42 + 0.04 * c, 0.92);
  lm[28] = at(0.58 - 0.04 * c, 0.92);
  lm[0] = at(0.5, 0.12);
  return lm;
}

export function syntheticSamples(duration = SYNTHETIC_DURATION, fps = 20): Sample[] {
  const samples: Sample[] = [];
  const n = Math.max(10, Math.round(duration * fps));
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * duration;
    const lm = dancer(t / duration);
    samples.push({ t, a: angles(lm, 9 / 16), lm });
  }
  for (const k of Object.keys(JOINTS)) {
    if (samples.every((s) => s.a[k] == null)) {
      throw new Error("synthetic move: angle manquant " + k);
    }
  }
  return samples;
}

export async function moveFileExists(src: string): Promise<boolean> {
  try {
    const r = await fetch(src, { method: "HEAD", cache: "no-store" });
    if (r.ok) return true;
    if (r.status === 405 || r.status === 501) {
      const g = await fetch(src, { method: "GET", headers: { Range: "bytes=0-1" }, cache: "no-store" });
      return g.ok || g.status === 206;
    }
    return false;
  } catch {
    return false;
  }
}
