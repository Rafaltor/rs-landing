"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MOVES, ROYALE, ROYALE_DURATION_FALLBACK, royaleWaves } from "@/lib/aura/config";
import { drawModel } from "@/lib/aura/draw";
import { loadModel } from "@/lib/aura/landmarker";
import { analyseVideo, keepAwake, unlockMedia, waitMeta } from "@/lib/aura/media";
import {
  advanceRoom,
  createRoom,
  makeCode,
  makeSecret,
  setRoomMode,
  cutoffRoyale,
  upsertSamples,
  fetchSamples,
  type Player,
  type RoyaleState,
  type Score,
} from "@/lib/aura/room";
import { moveFileExists, syntheticSamples } from "@/lib/aura/synthetic";
import { samplesCoverDuration } from "@/lib/aura/pose";
import { useRoom } from "@/hooks/aura/useRoom";

const HOST_KEY = "aura-host";

export default function HostPage() {
  const [code, setCode] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [bootError, setBootError] = useState("");
  const [busy, setBusy] = useState("");
  const created = useRef(false);

  useEffect(() => {
    if (created.current) return;
    created.current = true;
    (async () => {
      try {
        const saved = sessionStorage.getItem(HOST_KEY);
        if (saved) {
          const p = JSON.parse(saved) as { code: string; token: string };
          setCode(p.code);
          setToken(p.token);
          return;
        }
        const tokenN = makeSecret();
        let last = "";
        for (let i = 0; i < 6; i++) {
          const c = makeCode();
          last = c;
          try {
            const room = await createRoom(c, tokenN);
            sessionStorage.setItem(HOST_KEY, JSON.stringify({ code: room.code, token: tokenN }));
            setCode(room.code);
            setToken(tokenN);
            return;
          } catch {
            /* retry unique code */
          }
        }
        throw new Error("Impossible de créer le salon (" + last + ").");
      } catch (e) {
        setBootError(e instanceof Error ? e.message : "Création du salon impossible");
      }
    })();
  }, []);

  if (bootError) {
    return (
      <section className="screen col center gap ink scroll">
        <p className="kicker">Loi de la jungle</p>
        <h1 className="big">Salon HS</h1>
        <p className="error">{bootError}</p>
      </section>
    );
  }
  if (!code || !token) {
    return (
      <section className="screen col center gap ink">
        <p className="kicker">Just Aura</p>
        <h1 className="big">Ouverture du salon…</h1>
      </section>
    );
  }
  return <HostConsole code={code} token={token} busy={busy} setBusy={setBusy} />;
}

function HostConsole({
  code,
  token,
  busy,
  setBusy,
}: {
  code: string;
  token: string;
  busy: string;
  setBusy: (s: string) => void;
}) {
  const { room, players, scores, royale, error } = useRoom(code);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modelRef = useRef<HTMLCanvasElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const samplesCache = useRef<Record<string, Awaited<ReturnType<typeof syntheticSamples>>>>({});
  const t0 = useRef(0);
  const raf = useRef(0);
  const cutsFired = useRef<Set<number>>(new Set());
  const [clock, setClock] = useState({ t: 0, duration: ROYALE_DURATION_FALLBACK });

  const move = room?.mode === "royale" ? ROYALE : MOVES[room?.round ?? 0] ?? MOVES[0];
  const roundScores = scores.filter((s) => s.round === (room?.round ?? 0));
  const totals = useMemo(() => tally(players, scores), [players, scores]);

  useEffect(() => {
    if (room?.status !== "playing" && room?.status !== "preview") return;
    let stop = false;
    const video = videoRef.current;
    (async () => {
      const exists = await moveFileExists(move.src);
      if (stop) return;
      setHasVideo(exists);
      keepAwake();
      if (exists && videoRef.current) {
        videoRef.current.src = move.src;
        videoRef.current.muted = false;
        videoRef.current.playsInline = true;
        unlockMedia(videoRef.current);
        try {
          await waitMeta(videoRef.current);
          await videoRef.current.play();
        } catch {
          videoRef.current.muted = true;
          await videoRef.current.play();
        }
      } else {
        t0.current = performance.now();
        const samples = samplesCache.current[move.slug] ?? syntheticSamples();
        samplesCache.current[move.slug] = samples;
        const tick = () => {
          if (stop || !modelRef.current) return;
          const t = (performance.now() - t0.current) / 1000;
          drawModel(modelRef.current, samples, t);
          raf.current = requestAnimationFrame(tick);
        };
        tick();
      }
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(raf.current);
      video?.pause();
    };
  }, [room?.status, room?.round, move.slug, move.src]);

  async function prepare() {
    setBusy("Préparation de l'aura des moves…");
    try {
      await loadModel();
      for (let i = 0; i < MOVES.length; i++) {
        const m = MOVES[i];
        setBusy(`Move ${i + 1} / ${MOVES.length}…`);
        const exists = await moveFileExists(m.src);
        let samples;
        if (exists) {
          const v = document.createElement("video");
          v.playsInline = true;
          v.muted = true;
          v.src = m.src;
          samples = await analyseVideo(v);
        } else {
          samples = syntheticSamples();
        }
        samplesCache.current[m.slug] = samples;
        await upsertSamples(code, token, m.slug, samples);
      }
      setBusy("");
    } catch (e) {
      setBusy(e instanceof Error ? e.message : "Préparation impossible");
    }
  }

  async function startRoyale() {
    setBusy("Battle Royale : calibration du clip…");
    try {
      await setRoomMode(code, token, "royale");
      await loadModel();
      const exists = await moveFileExists(ROYALE.src);
      if (!exists) throw new Error("Dépose royale.mp4 dans public/moves.");
      let samples = samplesCache.current[ROYALE.slug] ?? (await fetchSamples(ROYALE.slug).catch(() => null));
      if (!samplesCoverDuration(samples, ROYALE_DURATION_FALLBACK)) {
        const v = document.createElement("video");
        v.playsInline = true;
        v.muted = true;
        v.src = ROYALE.src;
        samples = await analyseVideo(v, (_p, msg) => setBusy(msg));
      }
      samplesCache.current[ROYALE.slug] = samples;
      setBusy("Envoi des poses au salon…");
      await upsertSamples(code, token, ROYALE.slug, samples);
      setBusy("");
      await advanceRoom(code, token, "playing", 0);
    } catch (e) {
      setBusy(e instanceof Error ? e.message : "Battle Royale impossible");
    }
  }

  async function finishRoyale() {
    await advanceRoom(code, token, "finished", 0);
  }

  async function showMove(round: number) {
    setBusy("");
    await advanceRoom(code, token, "preview", round);
  }

  async function startMove(round: number) {
    setBusy("");
    await advanceRoom(code, token, "playing", round);
  }

  async function reveal() {
    await advanceRoom(code, token, "reveal", room?.round ?? 0);
  }

  async function next() {
    const r = (room?.round ?? 0) + 1;
    if (r >= MOVES.length) await advanceRoom(code, token, "finished", room?.round ?? 0);
    else await showMove(r);
  }

  useEffect(() => {
    if (room?.mode === "royale") return;
    if (room?.status !== "playing") return;
    if (players.length > 0 && roundScores.length >= players.length) {
      const t = window.setTimeout(() => {
        advanceRoom(code, token, "reveal", room.round).catch(() => {});
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [room?.status, room?.round, room?.mode, roundScores.length, players.length, code, token]);

  useEffect(() => {
    if (room?.mode !== "royale" || room.status !== "playing") return;
    const v = videoRef.current;
    if (!v) return;
    const onEnd = () => {
      advanceRoom(code, token, "finished", 0).catch(() => {});
    };
    v.addEventListener("ended", onEnd);
    return () => v.removeEventListener("ended", onEnd);
  }, [room?.mode, room?.status, hasVideo, code, token]);

  useEffect(() => {
    if (room?.mode !== "royale" || room.status !== "playing") return;
    cutsFired.current = new Set();
    const id = window.setInterval(() => {
      const v = videoRef.current;
      const duration = v?.duration && Number.isFinite(v.duration) && v.duration > 1 ? v.duration : ROYALE_DURATION_FALLBACK;
      const t = v && Number.isFinite(v.currentTime) ? v.currentTime : 0;
      setClock({ t, duration });
      for (const w of royaleWaves(players.length)) {
        const at = duration * w.frac;
        if (t >= at - 0.08 && !cutsFired.current.has(w.frac)) {
          cutsFired.current.add(w.frac);
          cutoffRoyale(code, token, w.keep).catch(() => {});
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [room?.mode, room?.status, players.length, code, token, hasVideo]);

  if (!room) {
    return (
      <section className="screen col center gap ink">
        <p className="kicker">Just Aura</p>
        <h1 className="big">{error || "Connexion…"}</h1>
      </section>
    );
  }

  if (room.status === "lobby") {
    return (
      <section className="screen col between gap ink scroll">
        <div>
          <p className="kicker">Salon ouvert · {players.length} mog</p>
          <p className="code">{code}</p>
          <p className="lede" style={{ color: "#fff" }}>Les joueurs vont sur l&apos;accueil, tapent ce code, et attendent la loi de la jungle.</p>
        </div>
        <div className="pills">
          {players.length === 0 && <span className="pill">Personne. L&apos;aura stagne.</span>}
          {players.map((p) => (
            <span className="pill" key={p.id}>{p.name}</span>
          ))}
        </div>
        <div className="controls">
          <button className="btn red" type="button" disabled={!players.length || !!busy} onClick={() => showMove(0)}>
            15 manches
          </button>
          <button className="btn red" type="button" disabled={!players.length || !!busy} onClick={startRoyale}>
            Battle Royale
          </button>
          <button className="btn secondary" type="button" onClick={prepare} disabled={!!busy} style={{ background: "transparent", color: "#fff", boxShadow: "inset 0 0 0 2px #fff" }}>
            Préparer l&apos;aura des moves
          </button>
          <p className="note" style={{ color: "#bbb" }}>{busy || "15 manches : démo puis danse. Battle Royale : live, pas de démo, les derniers du classement sortent à chaque coupe."}</p>
        </div>
      </section>
    );
  }

  if (room.mode === "royale" && (room.status === "playing" || room.status === "preview")) {
    const aliveRows = [...royale].filter((r) => r.alive).sort((a, b) => b.aura - a.aura || b.max_combo - a.max_combo || b.combo - a.combo);
    const waves = royaleWaves(players.length);
    const next = waves.find((w) => w.keep < Math.max(aliveRows.length, 1));
    const keep = next?.keep ?? 1;
    const remain = Math.max(0, (next ? clock.duration * next.frac : clock.duration) - clock.t);
    return (
      <section className="screen col gap ink" style={{ padding: "calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <p className="kicker">Battle Royale · live</p>
          <p className="note" style={{ color: "#bbb" }}>
            {next ? `Coupe dans ${Math.ceil(remain)}s · top ${keep} reste` : "Dernière ligne droite"}
            {" · "}
            {aliveRows.length}/{players.length} debout
          </p>
        </div>
        <div className="host-video">
          <video ref={videoRef} playsInline />
          {!hasVideo && <canvas ref={modelRef} width={720} height={1280} />}
        </div>
        <div className="pills">
          {players.map((p) => {
            const st = royale.find((r) => r.player_id === p.id);
            const dead = st ? !st.alive : false;
            const place = dead ? -1 : aliveRows.findIndex((r) => r.player_id === p.id) + 1;
            const danger = !dead && place > keep;
            return (
              <span
                className={`pill ${dead ? "" : danger ? "danger" : "done"}`}
                key={p.id}
                style={dead ? { opacity: 0.4, textDecoration: "line-through" } : undefined}
              >
                {dead ? p.name : `#${place} ${p.name}`} {st ? `${st.aura.toLocaleString("fr-FR")}` : ""}
              </span>
            );
          })}
        </div>
        <button className="btn red" type="button" onClick={finishRoyale}>Couronner le survivant</button>
      </section>
    );
  }

  if (room.mode === "royale" && room.status === "finished") {
    return (
      <section className="screen col between gap redbg scroll">
        <div>
          <p className="kicker" style={{ color: "#fff" }}>Battle Royale</p>
          <h1 className="big">Roi du mog</h1>
        </div>
        <Board dark rows={rankRoyale(players, royale)} unit=" combo max" />
        <button
          className="btn"
          type="button"
          onClick={() => {
            sessionStorage.removeItem(HOST_KEY);
            location.reload();
          }}
        >
          Nouveau salon
        </button>
      </section>
    );
  }

  if (room.status === "preview" || room.status === "playing") {
    const watching = room.status === "preview";
    return (
      <section className="screen col gap ink" style={{ padding: "calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <p className="kicker">{move.title} · {room.round + 1}/{MOVES.length}</p>
          <p className="note" style={{ color: "#bbb" }}>
            {watching ? "Démo — tout le monde regarde" : `${roundScores.length}/${players.length} ont mog`}
          </p>
        </div>
        <div className="host-video">
          <video ref={videoRef} playsInline />
          {!hasVideo && <canvas ref={modelRef} width={720} height={1280} />}
        </div>
        <div className="pills">
          {players.map((p) => (
            <span className={`pill ${!watching && roundScores.some((s) => s.player_id === p.id) ? "done" : ""}`} key={p.id}>
              {p.name}
            </span>
          ))}
        </div>
        {watching ? (
          <button className="btn red" type="button" onClick={() => startMove(room.round)}>Cultiver l&apos;aura</button>
        ) : (
          <button className="btn red" type="button" onClick={reveal}>Passer au classement</button>
        )}
      </section>
    );
  }

  if (room.status === "reveal") {
    const ranked = [...roundScores].sort((a, b) => b.aura - a.aura);
    return (
      <section className="screen col between gap ink scroll">
        <div>
          <p className="kicker">{move.title}</p>
          <h1 className="big">Classement du move</h1>
        </div>
        <Board rows={ranked.map((s) => ({ name: players.find((p) => p.id === s.player_id)?.name ?? "NPC", aura: s.aura, prec: s.prec }))} />
        <div>
          <p className="kicker">Cumul</p>
          <Board rows={totals} />
        </div>
        <button className="btn red" type="button" onClick={next}>
          {room.round + 1 >= MOVES.length ? "Couronner le roi du mog" : "Move suivant"}
        </button>
      </section>
    );
  }

  return (
    <section className="screen col between gap redbg scroll">
      <div>
        <p className="kicker" style={{ color: "#fff" }}>Soirée close</p>
        <h1 className="big">Roi du mog</h1>
      </div>
      <Board dark rows={totals} />
      <button
        className="btn"
        type="button"
        onClick={() => {
          sessionStorage.removeItem(HOST_KEY);
          location.reload();
        }}
      >
        Nouveau salon
      </button>
    </section>
  );
}

function tally(players: Player[], scores: Score[]) {
  return players
    .map((p) => {
      const mine = scores.filter((s) => s.player_id === p.id);
      return {
        name: p.name,
        aura: mine.reduce((a, s) => a + s.aura, 0),
        prec: mine.length ? Math.round(mine.reduce((a, s) => a + s.prec, 0) / mine.length) : 0,
      };
    })
    .sort((a, b) => b.aura - a.aura);
}

function rankRoyale(players: Player[], royale: RoyaleState[]) {
  return [...royale]
    .sort((a, b) => Number(b.alive) - Number(a.alive) || b.aura - a.aura || b.max_combo - a.max_combo)
    .map((r) => ({
      name: (players.find((p) => p.id === r.player_id)?.name ?? "NPC") + (r.alive ? "" : " · out"),
      aura: r.aura,
      prec: r.max_combo,
    }));
}

function Board({ rows, dark, unit = " % de précision" }: { rows: { name: string; aura: number; prec: number }[]; dark?: boolean; unit?: string }) {
  if (!rows.length) return <p className="note">Personne n&apos;a encore scoré.</p>;
  return (
    <div className="versus">
      {rows.map((r, i) => (
        <article className={`card ${i === 0 ? "win" : ""}`} key={r.name + i} style={dark && i !== 0 ? { boxShadow: "inset 0 0 0 2px #fff" } : undefined}>
          <h3>{i === 0 ? "Roi du mog · " : `#${i + 1} · `}{r.name}</h3>
          <div className="pts">{r.aura.toLocaleString("fr-FR")}</div>
          <p>{r.prec}{unit}</p>
        </article>
      ))}
    </div>
  );
}
