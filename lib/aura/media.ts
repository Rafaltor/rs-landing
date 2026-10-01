import { CALIB_RATE, SAMPLE_DT } from "./config";
import { detect } from "./landmarker";
import { angles, type Sample } from "./pose";

export function unlockMedia(video: HTMLVideoElement | null) {
  if (!video?.src) return;
  const wasMuted = video.muted;
  video.muted = false;
  const p = video.play();
  video.pause();
  video.muted = wasMuted;
  if (p) p.catch(() => {});
}

export async function keepAwake() {
  try {
    if ("wakeLock" in navigator) await navigator.wakeLock.request("screen");
  } catch {
    /* ignore */
  }
}

export function waitMeta(v: HTMLVideoElement, ms = 8000) {
  if (v.readyState >= 1) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const finish = (err?: Error) => {
      window.clearTimeout(timer);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("error", onErr);
      if (err) reject(err);
      else resolve();
    };
    const onMeta = () => finish();
    const onErr = () => finish(new Error("vidéo illisible"));
    const timer = window.setTimeout(() => finish(new Error("vidéo trop longue à charger")), ms);
    v.addEventListener("loadedmetadata", onMeta, { once: true });
    v.addEventListener("error", onErr, { once: true });
  });
}

export function bindMove(video: HTMLVideoElement, src: string) {
  video.playsInline = true;
  video.muted = true;
  video.preload = "auto";
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  if (video.getAttribute("src") !== src) video.src = src;
}

export function seekTo(video: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    if (video.readyState >= 1 && Math.abs(video.currentTime - t) < 0.04) {
      resolve();
      return;
    }
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = t;
    window.setTimeout(done, 500);
  });
}

const PORTRAIT_VIDEO: MediaTrackConstraints = {
  facingMode: { ideal: "user" },
  aspectRatio: { ideal: 9 / 16 },
  width: { ideal: 720 },
  height: { ideal: 1280 },
};

async function preferPortrait(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  try {
    await track.applyConstraints({
      aspectRatio: { ideal: 9 / 16 },
      width: { ideal: 720 },
      height: { ideal: 1280 },
    });
  } catch {
    /* iOS ignore souvent les contraintes : on recadre en pixels */
  }
}

/** Centre 9:16 d’un flux souvent 16:9. iOS n’applique pas object-fit sur getUserMedia. */
export function portraitCrop(vw: number, vh: number) {
  const target = 9 / 16;
  const src = vw / Math.max(vh, 1);
  if (src > target) {
    const sw = vh * target;
    return { sx: (vw - sw) / 2, sy: 0, sw, sh: vh };
  }
  const sh = vw / target;
  return { sx: 0, sy: Math.max(0, (vh - sh) / 2), sw: vw, sh };
}

export function drawPortraitFrame(cam: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const vw = cam.videoWidth;
  const vh = cam.videoHeight;
  if (!vw || !vh || cam.readyState < 2) return null;
  const stage = canvas.parentElement;
  const w = Math.max(2, stage?.clientWidth || canvas.clientWidth || 360);
  const h = Math.max(2, stage?.clientHeight || canvas.clientHeight || 640);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const crop = portraitCrop(vw, vh);
  const ctx = canvas.getContext("2d");
  if (!ctx) return crop;
  ctx.drawImage(cam, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
  return crop;
}

export function watchPortraitCam(cam: HTMLVideoElement, view: HTMLCanvasElement) {
  let raf = 0;
  let stop = false;
  const tick = () => {
    if (stop) return;
    drawPortraitFrame(cam, view);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    stop = true;
    cancelAnimationFrame(raf);
  };
}

export async function startCamera(cam: HTMLVideoElement) {
  const live = cam.srcObject instanceof MediaStream && cam.srcObject.getVideoTracks().some((t) => t.readyState === "live");
  if (live) {
    if (cam.paused) await cam.play();
    return cam.srcObject as MediaStream;
  }
  const tries: MediaStreamConstraints[] = [
    { video: PORTRAIT_VIDEO, audio: false },
    { video: { facingMode: { ideal: "user" }, aspectRatio: { ideal: 9 / 16 } }, audio: false },
    { video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } }, audio: false },
    { video: { facingMode: "user" }, audio: false },
    { video: true, audio: false },
  ];
  let last: unknown;
  for (const c of tries) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(c);
      cam.srcObject = stream;
      cam.muted = true;
      cam.playsInline = true;
      cam.setAttribute("playsinline", "true");
      cam.setAttribute("webkit-playsinline", "true");
      await cam.play();
      await preferPortrait(stream);
      return stream;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error("caméra refusée");
}

export async function analyseVideo(
  video: HTMLVideoElement,
  onProgress?: (p: number, message: string) => void,
): Promise<Sample[]> {
  const samples: Sample[] = [];
  video.muted = true;
  await waitMeta(video);
  const longClip = (video.duration || 0) > 20;
  video.playbackRate = longClip ? Math.max(CALIB_RATE, 4) : CALIB_RATE;
  await video.play();
  const aspect = video.videoWidth / (video.videoHeight || 1);
  await new Promise<void>((resolve) => {
    let lastT = -1;
    let lastKept = Number.NEGATIVE_INFINITY;
    const step = () => {
      if (video.ended) return resolve();
      if (video.readyState >= 2 && video.currentTime !== lastT) {
        lastT = video.currentTime;
        if (lastT - lastKept >= SAMPLE_DT) {
          lastKept = lastT;
          const res = detect(video);
          const lm = res?.landmarks?.[0];
          if (lm) samples.push({ t: lastT, a: angles(lm, aspect), lm: lm.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility })) });
        }
        onProgress?.(lastT / (video.duration || 1), "Calibration de l'aura du modèle…");
      }
      requestAnimationFrame(step);
    };
    video.addEventListener("ended", () => resolve(), { once: true });
    step();
  });
  video.pause();
  video.playbackRate = 1;
  if (samples.length < 10) throw new Error("modèle introuvable dans la vidéo");
  return samples;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
