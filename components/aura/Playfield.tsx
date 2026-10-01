"use client";

import { useEffect, useRef, useState } from "react";
import { RANKS, SYNTHETIC_DURATION, type MoveDef } from "@/lib/aura/config";
import { analyseVideo, bindMove, keepAwake, seekTo, startCamera, unlockMedia, waitMeta, watchPortraitCam } from "@/lib/aura/media";
import { loadModel } from "@/lib/aura/landmarker";
import { drawModel } from "@/lib/aura/draw";
import { runRound } from "@/lib/aura/run-round";
import { fetchSamples } from "@/lib/aura/room";
import { syntheticSamples, moveFileExists } from "@/lib/aura/synthetic";
import { samplesCoverDuration, type Sample } from "@/lib/aura/pose";

type PlayResult = { aura: number; prec: number; lives?: number; maxCombo?: number; eliminated?: boolean };
type Phase = "boot" | "watch" | "armed" | "playing";

export function Playfield({
  move,
  mirrorDefault = true,
  muted = false,
  watchFirst = true,
  scoring = true,
  royale = false,
  autoStart = false,
  startedAt = null,
  royalePlace = null,
  royaleKeep = null,
  onPulse,
  onFinished,
}: {
  move: MoveDef;
  mirrorDefault?: boolean;
  muted?: boolean;
  watchFirst?: boolean;
  scoring?: boolean;
  royale?: boolean;
  autoStart?: boolean;
  startedAt?: number | null;
  royalePlace?: number | null;
  royaleKeep?: number | null;
  onPulse?: (s: { aura: number; combo: number; lives: number; alive: boolean; maxCombo: number }) => void;
  onFinished: (r: PlayResult) => void;
}) {
  const refEl = useRef<HTMLVideoElement>(null);
  const camEl = useRef<HTMLVideoElement>(null);
  const viewEl = useRef<HTMLCanvasElement>(null);
  const skelEl = useRef<HTMLCanvasElement>(null);
  const pictoEl = useRef<HTMLCanvasElement>(null);
  const modelEl = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Préparation de l'aura…");
  const [progress, setProgress] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("boot");
  const [aura, setAura] = useState(0);
  const [combo, setCombo] = useState(0);
  const [gauge, setGauge] = useState(50);
  const [judge, setJudge] = useState<{ word: string; sub: string; bad: boolean; n: number } | null>(null);
  const [error, setError] = useState("");
  const [hasVideo, setHasVideo] = useState(false);
  const samplesRef = useRef<Sample[]>([]);
  const durationRef = useRef(SYNTHETIC_DURATION);
  const scoringRef = useRef(scoring);
  const watchGen = useRef(0);
  const t0 = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const watchRaf = useRef(0);
  const startedRound = useRef(false);
  const maxComboRef = useRef(0);
  const auraRef = useRef(0);
  const comboRef = useRef(0);

  function stopWatch() {
    watchGen.current += 1;
    cancelAnimationFrame(watchRaf.current);
    const v = refEl.current;
    if (v) {
      v.pause();
      void seekTo(v, 0);
    }
  }

  useEffect(() => {
    let gone = false;
    let stopFit = () => {};

    async function playWatch(exists: boolean, gen: number) {
      setPhase("watch");
      setStatus("Regarde le move. Ensuite tu copies.");
      const v = refEl.current;
      if (exists && v) {
        v.muted = true;
        await seekTo(v, 0);
        try {
          await v.play();
        } catch {
          /* muted autoplay */
        }
        await new Promise<void>((resolve) => {
          if (v.ended) return resolve();
          const onEnd = () => resolve();
          v.addEventListener("ended", onEnd, { once: true });
        });
      } else {
        t0.current = performance.now();
        await new Promise<void>((resolve) => {
          const tick = () => {
            if (gen !== watchGen.current) return resolve();
            const t = (performance.now() - t0.current) / 1000;
            if (modelEl.current) drawModel(modelEl.current, samplesRef.current, t);
            if (t >= durationRef.current) return resolve();
            watchRaf.current = requestAnimationFrame(tick);
          };
          tick();
        });
      }
      if (gone || gen !== watchGen.current) return;
      const canScore = scoringRef.current;
      setStatus(canScore ? "Tu as vu le move. À toi." : "Le roi du mog va lancer le mog.");
      setPhase((p) => (p === "playing" ? p : canScore ? "armed" : "watch"));
    }

    (async () => {
      try {
        if (!window.isSecureContext) throw new Error("La caméra ne fonctionne qu'en https.");
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Ouvre la page dans Safari (iPhone) ou Chrome (Android), pas dans Instagram ou TikTok.");
        }
        setStatus("Autorise la caméra pour jouer");
        await startCamera(camEl.current!);
        if (viewEl.current) stopFit = watchPortraitCam(camEl.current!, viewEl.current);
        keepAwake();
        setStatus("Chargement du juge…");
        await loadModel();
        const exists = await moveFileExists(move.src);
        if (gone) return;
        setHasVideo(exists);
        const ref = refEl.current;
        if (exists && ref) {
          bindMove(ref, move.src);
          await waitMeta(ref);
        }
        if (gone) return;
        setStatus("Préparation de l'aura…");
        let samples = await fetchSamples(move.slug).catch(() => null);
        const clipDur = exists && ref?.duration && Number.isFinite(ref.duration) ? ref.duration : 0;
        const cachedOk = !!(samples && samples.length >= 10 && (clipDur < 20 || samplesCoverDuration(samples, clipDur)));
        if (!cachedOk) {
          if (exists) {
            const v = refEl.current ?? document.createElement("video");
            bindMove(v, move.src);
            await waitMeta(v);
            samples = await analyseVideo(v, (p, msg) => {
              setStatus(msg);
              setProgress(p);
            });
          } else {
            samples = syntheticSamples();
          }
        }
        if (gone) return;
        if (!samples?.length) throw new Error("modèle introuvable dans la vidéo");
        samplesRef.current = samples;
        durationRef.current = exists && refEl.current?.duration ? refEl.current.duration : (samples.at(-1)?.t ?? SYNTHETIC_DURATION);
        setProgress(null);
        if (watchFirst && !royale) {
          const gen = watchGen.current;
          await playWatch(exists, gen);
        } else {
          setStatus(royale ? "Caméra ok. Regarde l'écran. Pas de démo." : "Mets-toi en entier dans le cadre");
          setPhase("armed");
        }
      } catch (e) {
        if (!gone) setError(e instanceof Error ? e.message : "Impossible de lancer la partie");
      }
    })();
    return () => {
      gone = true;
      stopFit();
      abortRef.current?.abort();
      cancelAnimationFrame(watchRaf.current);
    };
  }, [move.slug, move.src, watchFirst, royale]);

  useEffect(() => {
    const wasScoring = scoringRef.current;
    scoringRef.current = scoring;
    if (!scoring || wasScoring) return;
    stopWatch();
    queueMicrotask(() => {
      setPhase((p) => (p === "watch" ? "armed" : p));
      setStatus("À toi. Corps entier dans le cadre.");
    });
  }, [scoring]);

  function skipWatch() {
    stopWatch();
    setStatus(scoring ? "À toi. Corps entier dans le cadre." : "Le roi du mog va lancer le mog.");
    setPhase(scoring ? "armed" : "watch");
  }

  useEffect(() => {
    if (!autoStart || !scoring || phase !== "armed") return;
    queueMicrotask(() => {
      void begin();
    });
    // begin is recreated each render; the startedRound ref prevents a double start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, scoring, phase]);

  async function begin() {
    const cam = camEl.current, skel = skelEl.current, picto = pictoEl.current;
    if (!cam || !skel || !scoring || startedRound.current) return;
    startedRound.current = true;
    unlockMedia(refEl.current);
    keepAwake();
    setPhase("playing");
    setStatus("");
    maxComboRef.current = 0;
    const ac = new AbortController();
    abortRef.current = ac;
    t0.current = performance.now();
    const goAt = startedAt ?? Date.now();
    const result = await runRound({
      ref: royale ? null : hasVideo ? refEl.current : null,
      duration: durationRef.current,
      cam,
      skel,
      picto,
      samples: samplesRef.current,
      mirror: mirrorDefault,
      muted,
      getTime: () => {
        if (royale) return Math.max(0, (Date.now() - goAt) / 1000);
        if (hasVideo && refEl.current) return refEl.current.currentTime;
        return (performance.now() - t0.current) / 1000;
      },
      abort: ac.signal,
      cb: {
        onAura: (a, c) => {
          auraRef.current = a;
          comboRef.current = c;
          setAura(a);
          setCombo(c);
          if (c > maxComboRef.current) maxComboRef.current = c;
        },
        onJudge: (word, sub, bad) => {
          setJudge({ word, sub, bad, n: Date.now() });
          onPulse?.({
            aura: auraRef.current,
            combo: comboRef.current,
            lives: 0,
            alive: true,
            maxCombo: maxComboRef.current,
          });
        },
        onGauge: setGauge,
        onStatus: (t) => setStatus(t ?? ""),
        onTime: (t) => {
          if (!hasVideo && modelEl.current) drawModel(modelEl.current, samplesRef.current, t);
        },
      },
    });
    setPhase("armed");
    onFinished({
      ...result,
      maxCombo: maxComboRef.current,
      eliminated: false,
    });
  }

  const watching = phase === "watch";
  const showHud = phase === "playing";

  return (
    <section className={`screen game ${watching ? "game--watch" : "game--play"}${royale ? " game--royale" : ""}`}>
      <div className="pane" id="refPane">
        <video ref={refEl} playsInline preload="auto" />
        {!hasVideo && <canvas ref={modelEl} width={360} height={640} />}
        <span className="pane-label">{watching ? "Le move" : "Le modèle"}</span>
      </div>
      <div className={`pane cam ${mirrorDefault ? "mirror" : ""}`}>
        <div className="cam-stage">
          <video ref={camEl} className="cam-src" playsInline muted autoPlay />
          <canvas ref={viewEl} className="cam-view" />
          <canvas ref={skelEl} />
        </div>
        <span className="pane-label">Toi</span>
      </div>
      {showHud && (
        <div className="hud">
          <div>
            <div className="score">
              {aura.toLocaleString("fr-FR")}
              <small>points d&apos;aura</small>
            </div>
            <div className={`gauge ${gauge >= 95 ? "max" : ""}`}>
              <div className="gauge-track"><i style={{ width: `${gauge}%` }} /></div>
              <span className="gauge-label">{gauge >= 95 ? "Aura max" : "Jauge d'aura"}</span>
            </div>
            {royale && royalePlace != null && (
              <div className={`royale-rank ${royaleKeep != null && royalePlace > royaleKeep ? "danger" : ""}`}>
                #{royalePlace}
                <small>{royaleKeep != null ? `Top ${royaleKeep} passe` : "Classement"}</small>
              </div>
            )}
          </div>
          <div className="combo">{combo >= 3 ? "×" + combo : ""}</div>
        </div>
      )}
      <div className="picto" id="picto">
        <canvas ref={pictoEl} width={80} height={104} />
        <span>Prochain mog</span>
      </div>
      {judge && (
        <div key={judge.n} className={`judge show ${judge.bad ? "bad" : ""}`}>
          {judge.word}
          <small>{judge.sub}</small>
        </div>
      )}
      <div className={`status ${status ? "on" : ""}`} role="status">
        <span>{status}</span>
        {progress != null && <div className="bar"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
      </div>
      {error && <p className="error" style={{ position: "absolute", bottom: 80, left: 24, right: 24, zIndex: 8 }}>{error}</p>}
      <button className="btn secondary ready" hidden={phase !== "watch"} onClick={skipWatch} type="button">
        Passer
      </button>
      <button className="btn red ready" hidden={phase !== "armed" || !scoring || autoStart} onClick={begin} type="button">
        Cultiver l&apos;aura
      </button>
    </section>
  );
}

export function ResultView({ aura, prec, onAgain, onHome }: PlayResult & { onAgain?: () => void; onHome: () => void }) {
  const r = RANKS.find((x) => prec >= x.min) ?? RANKS[RANKS.length - 1];
  return (
    <section className="screen col center gap redbg scroll">
      <h2 className="rank">{r.name}</h2>
      <p className="verdict">{r.text}</p>
      <div className="totals">
        <div>{aura.toLocaleString("fr-FR")}<span>points d&apos;aura</span></div>
        <div>{prec} %<span>de précision</span></div>
      </div>
      <div className="controls">
        {onAgain && <button className="btn" type="button" onClick={onAgain}>Rejouer</button>}
        <button className="btn secondary" type="button" onClick={onHome} style={{ background: "transparent", color: "#fff", boxShadow: "inset 0 0 0 2px #fff" }}>
          Accueil
        </button>
      </div>
    </section>
  );
}
