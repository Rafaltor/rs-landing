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

async function releaseZoom(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: { min?: number } }) | undefined;
  const minZoom = caps?.zoom?.min;
  if (!track || minZoom == null) return;
  try {
    await track.applyConstraints({ advanced: [{ zoom: minZoom }] } as unknown as MediaTrackConstraints);
  } catch {
    /* pas de zoom matériel */
  }
}

/** Moins serré que 9:16 : on élargit le cadre pour voir plus le corps. */
const VIEW_ZOOM = 0.62;

/** Centre du flux, élargi pour dézoomer. iOS n’applique pas object-fit sur getUserMedia. */
export function portraitCrop(vw: number, vh: number) {
  const target = 9 / 16;
  const src = vw / Math.max(vh, 1);
  let sw: number;
  let sh: number;
  if (src > target) {
    sh = vh;
    sw = vh * target;
  } else {
    sw = vw;
    sh = vw / target;
  }
  sw = Math.min(vw, sw / VIEW_ZOOM);
  sh = Math.min(vh, sh / VIEW_ZOOM);
  const sx = Math.max(0, (vw - sw) / 2);
  const sy = Math.max(0, (vh - sh) / 2);
  return { sx, sy, sw, sh };
}

export function portraitFrame(vw: number, vh: number, cw: number, ch: number) {
  const crop = portraitCrop(vw, vh);
  const aspect = crop.sw / Math.max(crop.sh, 1);
  const canvasAspect = cw / Math.max(ch, 1);
  let dw: number;
  let dh: number;
  if (aspect > canvasAspect) {
    dw = cw;
    dh = cw / aspect;
  } else {
    dh = ch;
    dw = ch * aspect;
  }
  return {
    ...crop,
    dx: (cw - dw) / 2,
    dy: (ch - dh) / 2,
    dw,
    dh,
  };
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
  const frame = portraitFrame(vw, vh, w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return frame;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(cam, frame.sx, frame.sy, frame.sw, frame.sh, frame.dx, frame.dy, frame.dw, frame.dh);
  return frame;
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
    { video: { facingMode: "user" }, audio: false },
    { video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
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
      await releaseZoom(stream);
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
  video.playsInline = true;
  await waitMeta(video);
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const longClip = duration > 20;
  video.playbackRate = longClip ? 2 : CALIB_RATE;
  try {
    await video.play();
  } catch {
    video.muted = true;
    await video.play();
  }
  const aspect = video.videoWidth / (video.videoHeight || 1);
  let lastKept = Number.NEGATIVE_INFINITY;
  let lastSeen = -1;
  let stuck = 0;
  const deadline = performance.now() + Math.max(15000, (duration / (video.playbackRate || 1)) * 1000 + 6000);
  while (performance.now() < deadline) {
    if (video.ended || (duration > 1 && video.currentTime >= duration - 0.08)) break;
    if (Math.abs(video.currentTime - lastSeen) < 0.02) stuck += 1;
    else {
      stuck = 0;
      lastSeen = video.currentTime;
    }
    if (stuck > 50 && video.currentTime > 0.5) break;
    if (video.readyState >= 2 && video.currentTime - lastKept >= SAMPLE_DT) {
      lastKept = video.currentTime;
      const res = detect(video);
      const lm = res?.landmarks?.[0];
      if (lm) samples.push({ t: video.currentTime, a: angles(lm, aspect), lm: lm.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility })) });
      onProgress?.(video.currentTime / (duration || 1), "Calibration de l'aura du modèle…");
    }
    await sleep(40);
  }
  video.pause();
  video.playbackRate = 1;
  if (samples.length < 10) throw new Error("modèle introuvable dans la vidéo");
  return samples;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
