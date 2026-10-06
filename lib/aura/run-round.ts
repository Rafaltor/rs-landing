import { JUDGMENTS, WINDOW_MS } from "./config";
import { drawPicto, drawSkeleton } from "./draw";
import { detect } from "./landmarker";
import { portraitFrame, seekTo } from "./media";
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
  followClock?: boolean;
  cb: RoundCallbacks;
}): Promise<{ aura: number; prec: number }> {
  const { cam, skel, picto, samples, mirror, muted, abort, cb } = opts;
  const ctx = skel.getContext("2d");
  if (!ctx) throw new Error("canvas");

  if (opts.ref) {
    opts.ref.pause();
    const at = opts.followClock ? Math.max(0, opts.getTime()) : 0;
    await seekTo(opts.ref, at);
    opts.ref.muted = opts.followClock ? true : muted;
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
  let lastSeek = 0;
  let lastDetect = 0;
  let lastResume = 0;

  cb.onAura(0, 0);
  cb.onGauge(gauge);

  await new Promise<void>((resolve) => {
    const tick = () => {
      if (abort.aborted) return resolve();
      const t = opts.getTime();
      const duration = opts.duration || opts.ref?.duration || 0;
      cb.onTime(t, duration);
      const now = performance.now();
      if (opts.followClock && opts.ref && !opts.ref.seeking && Number.isFinite(opts.ref.duration)) {
        const drift = Math.abs(opts.ref.currentTime - t);
        if (drift > 1.5 && now - lastSeek > 3000) {
          lastSeek = now;
          opts.ref.currentTime = Math.min(t, Math.max(0, opts.ref.duration - 0.05));
        }
      }
      if (now - lastResume > 2000) {
        lastResume = now;
        if (opts.followClock && opts.ref?.paused && !opts.ref.ended) void opts.ref.play().catch(() => {});
        if (cam.paused && cam.srcObject) void cam.play().catch(() => {});
      }
      if (duration && t >= duration - 0.05) return resolve();
      if (!opts.followClock && opts.ref?.ended) return resolve();

      if (picto) {
        const live = opts.followClock && opts.ref && Number.isFinite(opts.ref.currentTime) ? opts.ref.currentTime : t;
        const on = drawPicto(picto, samples, opts.followClock ? live : t, mirror, opts.followClock ? 0 : undefined);
        picto.parentElement?.classList.toggle("on", on);
      }

      if (cam.readyState >= 2 && cam.currentTime !== lastCamT && now - lastDetect >= 80) {
        lastCamT = cam.currentTime;
        lastDetect = now;
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
        const frame = portraitFrame(vw, vh, skel.width, skel.height);
        const mapped = lm?.map((p) => ({
          ...p,
          x: (frame.dx + ((p.x * vw - frame.sx) / frame.sw) * frame.dw) / skel.width,
          y: (frame.dy + ((p.y * vh - frame.sy) / frame.sh) * frame.dh) / skel.height,
        })) ?? null;
        lastScore = lm ? bestMatch(angles(lm, vw / vh), t, mirror, samples) : null;
        const ok = lastScore != null && lastScore >= 0.62;
        drawSkeleton(ctx, mapped, skel.width, skel.height, ok ? "#FFFFFF" : "#FF1A1A");
        if (lastScore != null) frames.push(lastScore);
      }

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
