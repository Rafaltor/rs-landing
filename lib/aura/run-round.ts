import { JUDGMENTS, WINDOW_MS } from "./config";
import { drawPicto, drawSkeleton } from "./draw";
import { detect } from "./landmarker";
import { portraitCrop, seekTo } from "./media";
import { angles, bestMatch, type Landmark, type Sample } from "./pose";

export type RoundCallbacks = {
  onAura: (aura: number, combo: number) => void;
  onJudge: (word: string, sub: string, bad: boolean) => void;
  onGauge: (value: number) => void;
  onStatus: (text: string | null) => void;
  onTime: (t: number, duration: number) => void;
};

export async function runRound(opts: {
  ref: HTMLVideoElement | null;
  duration: number;
  cam: HTMLVideoElement;
  skel: HTMLCanvasElement;
  picto: HTMLCanvasElement | null;
  samples: Sample[];
  mirror: boolean;
  muted: boolean;
  getTime: () => number;
  abort: AbortSignal;
  cb: RoundCallbacks;
}): Promise<{ aura: number; prec: number }> {
  const { cam, skel, picto, samples, mirror, muted, abort, cb } = opts;
  const ctx = skel.getContext("2d");
  if (!ctx) throw new Error("canvas");

  if (opts.ref) {
    opts.ref.pause();
    await seekTo(opts.ref, 0);
    opts.ref.muted = muted;
    try {
      await opts.ref.play();
    } catch {
      opts.ref.muted = true;
      await opts.ref.play();
    }
  }

  let aura = 0;
  let combo = 0;
  let gauge = 50;
  let frames: number[] = [];
  const allScores: number[] = [];
  let windowStart = performance.now();
  let lastCamT = -1;
  let lastScore: number | null = null;

  cb.onAura(0, 0);
  cb.onGauge(gauge);

  await new Promise<void>((resolve) => {
    const tick = () => {
      if (abort.aborted) return resolve();
      const t = opts.getTime();
      const duration = opts.duration || opts.ref?.duration || 0;
      cb.onTime(t, duration);
      if (duration && t >= duration - 0.05) return resolve();
      if (opts.ref?.ended) return resolve();

      if (picto) {
        const on = drawPicto(picto, samples, t, mirror);
        picto.parentElement?.classList.toggle("on", on);
      }

      if (cam.readyState >= 2 && cam.currentTime !== lastCamT) {
        lastCamT = cam.currentTime;
        const res = detect(cam);
        const lm = (res?.landmarks?.[0] ?? null) as Landmark[] | null;
        const view = skel.parentElement?.querySelector("canvas.cam-view");
        const box = view instanceof HTMLCanvasElement ? view : skel;
        const w = box.clientWidth || 360;
        const h = box.clientHeight || 640;
        if (skel.width !== w || skel.height !== h) {
          skel.width = w;
          skel.height = h;
        }
        const vw = cam.videoWidth || 16;
        const vh = cam.videoHeight || 9;
        const crop = portraitCrop(vw, vh);
        const mapped = lm?.map((p) => ({
          ...p,
          x: (p.x * vw - crop.sx) / crop.sw,
          y: (p.y * vh - crop.sy) / crop.sh,
        })) ?? null;
        lastScore = lm ? bestMatch(angles(lm, vw / vh), t, mirror, samples) : null;
        const ok = lastScore != null && lastScore >= 0.62;
        drawSkeleton(ctx, mapped, skel.width, skel.height, ok ? "#FFFFFF" : "#FF1A1A");
        if (lastScore != null) frames.push(lastScore);
      }

      const now = performance.now();
      if (now - windowStart >= WINDOW_MS) {
        windowStart = now;
        if (frames.length === 0) {
          cb.onStatus("On ne te voit pas : recule pour être en entier dans le cadre");
        } else {
          cb.onStatus(null);
          const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
          allScores.push(avg);
          const j = JUDGMENTS.find((x) => avg >= x.min) ?? JUDGMENTS[JUDGMENTS.length - 1];
          combo = j.bad ? 0 : combo + 1;
          const gain = j.bad ? j.aura : j.aura * (1 + Math.floor(combo / 5) * 0.5);
          aura += Math.round(gain);
          gauge = Math.max(0, Math.min(100, gauge + (j.bad ? -18 : j.min >= 0.8 ? 14 : j.min >= 0.62 ? 8 : 2)));
          cb.onAura(aura, combo);
          cb.onGauge(gauge);
          cb.onJudge(j.word, `${gain > 0 ? "+" : ""}${Math.round(gain).toLocaleString("fr-FR")} aura`, j.bad);
        }
        frames = [];
      }
      requestAnimationFrame(tick);
    };
    tick();
  });

  const prec = allScores.length ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) : 0;
  return { aura, prec };
}
