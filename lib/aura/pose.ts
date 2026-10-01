import { BONES, JOINTS, LAG, SAMPLE_DT, SWAP, TOLERANCE_DEG } from "./config";

export type Landmark = { x: number; y: number; z?: number; visibility?: number };
export type Angles = Record<string, number | null>;
export type Sample = { t: number; a: Angles; lm?: Landmark[] };

const BONE_POINTS = [...new Set(BONES.flat())];

export function compactSamples(samples: Sample[], dt = SAMPLE_DT): Sample[] {
  if (!samples.length) return samples;
  const out: Sample[] = [];
  let next = Number.NEGATIVE_INFINITY;
  for (const s of samples) {
    if (s.t + 1e-6 < next) continue;
    next = s.t + dt;
    const a: Angles = {};
    for (const k of Object.keys(JOINTS)) {
      const v = s.a[k];
      a[k] = v == null ? null : Math.round(v * 10) / 10;
    }
    const lm: Landmark[] = [];
    if (s.lm) {
      for (const i of BONE_POINTS) {
        const p = s.lm[i];
        if (!p) continue;
        lm[i] = {
          x: +p.x.toFixed(3),
          y: +p.y.toFixed(3),
          visibility: +(p.visibility ?? 1).toFixed(2),
        };
      }
    }
    out.push({ t: +s.t.toFixed(3), a, lm: lm.length ? lm : undefined });
  }
  return out;
}

export function packLandmarks(lm?: Landmark[]) {
  if (!lm?.length) return undefined;
  const o: Record<string, { x: number; y: number; visibility: number }> = {};
  for (const i of BONE_POINTS) {
    const p = lm[i];
    if (!p) continue;
    o[String(i)] = {
      x: +p.x.toFixed(3),
      y: +p.y.toFixed(3),
      visibility: +(p.visibility ?? 1).toFixed(2),
    };
  }
  return Object.keys(o).length ? o : undefined;
}

export function unpackLandmarks(raw: unknown): Landmark[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw as Landmark[];
  if (typeof raw === "object") {
    const out: Landmark[] = [];
    for (const [k, v] of Object.entries(raw as Record<string, Landmark>)) {
      const i = Number(k);
      if (Number.isFinite(i) && v) out[i] = v;
    }
    return out.length ? out : undefined;
  }
  return undefined;
}

export function samplesCoverDuration(samples: Sample[] | null | undefined, duration: number) {
  if (!samples || samples.length < 10) return false;
  const last = samples[samples.length - 1]?.t ?? 0;
  return last >= Math.max(1, duration) * 0.85;
}

export function angles(lm: Landmark[], aspect: number): Angles {
  const out: Angles = {};
  for (const [k, [a, b, c]] of Object.entries(JOINTS)) {
    const A = lm[a], B = lm[b], C = lm[c];
    if (!A || !B || !C || Math.min(A.visibility ?? 1, B.visibility ?? 1, C.visibility ?? 1) < 0.5) {
      out[k] = null;
      continue;
    }
    const v1x = (A.x - B.x) * aspect, v1y = A.y - B.y;
    const v2x = (C.x - B.x) * aspect, v2y = C.y - B.y;
    const cos = (v1x * v2x + v1y * v2y) / (Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) || 1);
    out[k] = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  }
  return out;
}

export function similarity(user: Angles, model: Angles, mirror: boolean): number | null {
  let sum = 0, n = 0;
  for (const k of Object.keys(JOINTS) as (keyof typeof JOINTS)[]) {
    const u = user[mirror ? SWAP[k] : k];
    const m = model[k];
    if (u == null || m == null) continue;
    sum += Math.abs(u - m);
    n++;
  }
  if (n < 3) return null;
  return Math.max(0, 1 - sum / n / TOLERANCE_DEG);
}

export function bestMatch(user: Angles, t: number, mirror: boolean, samples: Sample[]): number | null {
  let lo = 0, hi = samples.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t < t - LAG) lo = mid + 1;
    else hi = mid;
  }
  let best: number | null = null;
  for (let i = lo; i < samples.length && samples[i].t <= t + 0.05; i++) {
    const s = similarity(user, samples[i].a, mirror);
    if (s != null && (best == null || s > best)) best = s;
  }
  return best;
}

export function sampleAt(samples: Sample[], t: number): Sample | null {
  if (!samples.length) return null;
  let lo = 0, hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  const a = samples[Math.max(0, lo - 1)];
  const b = samples[lo];
  if (!a) return b;
  if (!b) return a;
  return Math.abs(a.t - t) <= Math.abs(b.t - t) ? a : b;
}

function all(v: number): Angles {
  const out: Angles = {};
  for (const k of Object.keys(JOINTS)) out[k] = v;
  return out;
}

export function assertPoseLogic() {
  const same = all(90);
  if (similarity(same, same, false) !== 1) throw new Error("pose identique doit faire 100 %");
  const left: Angles = { ...all(90), lElbow: 40, rElbow: 140 };
  const right: Angles = { ...all(90), lElbow: 140, rElbow: 40 };
  if (similarity(left, right, true) !== 1) throw new Error("pose en reflet doit faire 100 %");
  const far = all(180);
  if ((similarity(same, far, false) ?? 1) !== 0) throw new Error("pose différente doit faire 0 %");
  const dense: Sample[] = Array.from({ length: 20 }, (_, i) => ({ t: i * 0.03, a: same }));
  if (compactSamples(dense).length > 8) throw new Error("compact doit sous-échantillonner");
}

assertPoseLogic();
