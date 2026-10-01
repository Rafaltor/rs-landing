"use client";

import { useEffect, useRef, useState } from "react";
import { RANKS, SYNTHETIC_DURATION, type MoveDef } from "@/lib/aura/config";
import { analyseVideo, keepAwake, startCamera, unlockMedia } from "@/lib/aura/media";
import { loadModel } from "@/lib/aura/landmarker";
import { drawModel } from "@/lib/aura/draw";
import { runRound } from "@/lib/aura/run-round";
import { fetchSamples } from "@/lib/aura/room";
import { syntheticSamples, moveFileExists } from "@/lib/aura/synthetic";
import type { Sample } from "@/lib/aura/pose";

type PlayResult = { aura: number; prec: number };

export function Playfield({
  move,
  mirrorDefault = true,
  muted = false,
  autoReady = false,
  onFinished,
}: {
  move: MoveDef;
  mirrorDefault?: boolean;
  muted?: boolean;
  autoReady?: boolean;
  onFinished: (r: PlayResult) => void;
}) {
  const refEl = useRef<HTMLVideoElement>(null);
  const camEl = useRef<HTMLVideoElement>(null);
  const skelEl = useRef<HTMLCanvasElement>(null);
  const pictoEl = useRef<HTMLCanvasElement>(null);
  const modelEl = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Préparation de l'aura…");
  const [progress, setProgress] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [aura, setAura] = useState(0);
  const [combo, setCombo] = useState(0);
  const [gauge, setGauge] = useState(50);
  const [judge, setJudge] = useState<{ word: string; sub: string; bad: boolean; n: number } | null>(null);
  const [error, setError] = useState("");
  const [hasVideo, setHasVideo] = useState(false);
  const samplesRef = useRef<Sample[]>([]);
  const durationRef = useRef(SYNTHETIC_DURATION);
  const t0 = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        if (!window.isSecureContext) throw new Error("La caméra ne fonctionne qu'en https.");
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Ouvre la page dans Safari (iPhone) ou Chrome (Android), pas dans Instagram ou TikTok.");
        }
        setStatus("Autorise la caméra pour jouer");
        await startCamera(camEl.current!);
        keepAwake();
        setStatus("Chargement du juge…");
        await loadModel();
        const exists = await moveFileExists(move.src);
        if (gone) return;
        setHasVideo(exists);
        if (exists && refEl.current) {
          refEl.current.src = move.src;
          refEl.current.setAttribute("playsinline", "true");
          refEl.current.setAttribute("webkit-playsinline", "true");
          refEl.current.playsInline = true;
        }
        let samples = await fetchSamples(move.slug).catch(() => null);
        if (!samples) {
          if (exists && refEl.current) {
            samples = await analyseVideo(refEl.current, (p, msg) => {
              setStatus(msg);
              setProgress(p);
            });
          } else {
            samples = syntheticSamples();
          }
        }
        if (gone) return;
        samplesRef.current = samples;
        durationRef.current = exists && refEl.current?.duration ? refEl.current.duration : (samples.at(-1)?.t ?? SYNTHETIC_DURATION);
        setProgress(null);
        setStatus("Mets-toi en entier dans le cadre");
        setReady(true);
        if (autoReady) {
          /* host/player still taps on some devices; auto is for muted player after camera already granted */
        }
      } catch (e) {
        if (!gone) setError(e instanceof Error ? e.message : "Impossible de lancer la partie");
      }
    })();
    return () => {
      gone = true;
      abortRef.current?.abort();
    };
  }, [move.slug, move.src, autoReady]);

  async function begin() {
    const cam = camEl.current, skel = skelEl.current, picto = pictoEl.current;
    if (!cam || !skel) return;
    unlockMedia(refEl.current);
    keepAwake();
    setReady(false);
    setRunning(true);
    setStatus("");
    const ac = new AbortController();
    abortRef.current = ac;
    t0.current = performance.now();
    const result = await runRound({
      ref: hasVideo ? refEl.current : null,
      duration: durationRef.current,
      cam,
      skel,
      picto,
      samples: samplesRef.current,
      mirror: mirrorDefault,
      muted,
      getTime: () => {
        if (hasVideo && refEl.current) return refEl.current.currentTime;
        return (performance.now() - t0.current) / 1000;
      },
      abort: ac.signal,
      cb: {
        onAura: (a, c) => { setAura(a); setCombo(c); },
        onJudge: (word, sub, bad) => setJudge({ word, sub, bad, n: Date.now() }),
        onGauge: setGauge,
        onStatus: (t) => setStatus(t ?? ""),
        onTime: (t) => {
          if (!hasVideo && modelEl.current) drawModel(modelEl.current, samplesRef.current, t);
        },
      },
    });
    setRunning(false);
    onFinished(result);
  }

  return (
    <section className="screen game">
      <div className="pane" id="refPane">
        {hasVideo ? (
          <video ref={refEl} playsInline preload="auto" />
        ) : (
          <canvas ref={modelEl} width={360} height={640} />
        )}
        <span className="pane-label">Le modèle</span>
      </div>
      <div className={`pane ${mirrorDefault ? "mirror" : ""}`}>
        <video ref={camEl} playsInline muted autoPlay />
        <canvas ref={skelEl} />
        <span className="pane-label">Toi</span>
      </div>
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
        </div>
        <div className="combo">{combo >= 3 ? "×" + combo : ""}</div>
      </div>
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
      <button className="btn red ready" hidden={!ready || running} onClick={begin} type="button">
        Je suis prêt
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
