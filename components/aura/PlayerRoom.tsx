"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Playfield } from "@/components/aura/Playfield";
import { MOVES, ROYALE, royaleWaves } from "@/lib/aura/config";
import { joinRoom, makeSecret, pulseRoyale, submitScore } from "@/lib/aura/room";
import { useRoom } from "@/hooks/aura/useRoom";

type Me = { id: string; secret: string; name: string; code: string };

function subscribe() {
  return () => {};
}

function seatKey(code: string) {
  return "aura-player-" + code;
}

function readPlayer(code: string) {
  const key = seatKey(code);
  try {
    const session = sessionStorage.getItem(key);
    const local = localStorage.getItem(key);
    const raw = session || local;
    if (!raw) return null;
    if (!session) sessionStorage.setItem(key, raw);
    if (!local) localStorage.setItem(key, raw);
    return raw;
  } catch {
    return null;
  }
}

function savePlayer(code: string, me: Me) {
  const raw = JSON.stringify(me);
  const key = seatKey(code);
  try { sessionStorage.setItem(key, raw); } catch { /* navigation privée */ }
  try { localStorage.setItem(key, raw); } catch { /* navigation privée */ }
}

function parseMe(raw: string | null): Me | null {
  if (!raw) return null;
  try {
    const me = JSON.parse(raw) as Me;
    if (!me?.id || !me?.secret) return null;
    return me;
  } catch {
    return null;
  }
}

export function PlayerRoom({ code }: { code: string }) {
  const q = useSearchParams();
  const router = useRouter();
  const name = q.get("nom") || "NPC";
  const [retry, setRetry] = useState(0);
  const { room, players, scores, royale, error } = useRoom(code, { retry });
  const savedRaw = useSyncExternalStore(subscribe, () => readPlayer(code), () => null);
  const saved = parseMe(savedRaw);
  const [joinedMe, setJoinedMe] = useState<Me | null>(null);
  const [joinErr, setJoinErr] = useState("");
  const lastPulse = useRef(0);
  const joining = useRef(false);
  const [doneRound, setDoneRound] = useState<number | null>(null);
  const me = saved ?? joinedMe;

  useEffect(() => {
    if (me || joining.current) return;
    joining.current = true;
    (async () => {
      try {
        const secret = makeSecret();
        const row = await joinRoom(code, name, secret);
        const m = { id: row.id, secret, name: row.name, code: row.code };
        savePlayer(code, m);
        setJoinedMe(m);
      } catch (e) {
        setJoinErr(e instanceof Error ? e.message : "Impossible de rejoindre");
      }
    })();
  }, [code, name, me, retry]);

  if (joinErr || error) {
    return (
      <section className="screen col center gap">
        <p className="kicker">Aura loss</p>
        <h1 className="big">{joinErr || error}</h1>
        <button className="btn" type="button" onClick={() => { setJoinErr(""); joining.current = false; setRetry((n) => n + 1); }}>Réessayer</button>
        <button className="btn" type="button" onClick={() => router.push("/aura")}>Accueil</button>
      </section>
    );
  }
  if (!room || !me) {
    return (
      <section className="screen col center gap">
        <p className="kicker">Loi de la jungle</p>
        <h1 className="big">On entre dans le salon…</h1>
      </section>
    );
  }

  if (room.mode === "royale") {
    const mine = royale.find((r) => r.player_id === me.id);
    if (room.status === "finished") {
      const ranked = [...royale].sort((a, b) => Number(b.alive) - Number(a.alive) || b.aura - a.aura || b.max_combo - a.max_combo);
      const place = ranked.findIndex((r) => r.player_id === me.id) + 1;
      const win = place === 1;
      return (
        <section className={`screen col center gap ${win ? "redbg" : "ink"} scroll`}>
          <p className="kicker">{win ? "Dernier mog debout" : "Battle Royale"}</p>
          <h1 className="big">{win ? "Roi du mog" : place ? `#${place}` : "Out"}</h1>
          <p className="lede" style={{ color: "#fff" }}>
            {(mine?.aura ?? 0).toLocaleString("fr-FR")} aura · combo max ×{mine?.max_combo ?? 0}
          </p>
          <button className="btn" type="button" onClick={() => router.push("/aura")}>Accueil</button>
        </section>
      );
    }
    if (room.status === "playing" && mine && !mine.alive) {
      return (
        <section className="screen col center gap ink">
          <p className="kicker">Battle Royale</p>
          <h1 className="big">T&apos;es out</h1>
          <p className="lede" style={{ color: "#fff" }}>
            Trop bas au classement. Les mieux classés passent. Regarde l&apos;écran.
          </p>
        </section>
      );
    }
    if (room.status === "playing") {
      const startedAt = room.round_started_at ? Date.parse(room.round_started_at) : null;
      const aliveRanked = [...royale]
        .filter((r) => r.alive)
        .sort((a, b) => b.aura - a.aura || b.max_combo - a.max_combo || b.combo - a.combo);
      const place = aliveRanked.findIndex((r) => r.player_id === me.id) + 1;
      const next = royaleWaves(players.length).find((w) => w.keep < Math.max(aliveRanked.length, 1));
      return (
        <Playfield
          key="royale"
          move={ROYALE}
          muted
          mirrorDefault
          watchFirst={false}
          scoring={room.status === "playing"}
          royale
          autoStart={room.status === "playing"}
          startedAt={startedAt && Number.isFinite(startedAt) ? startedAt : null}
          royalePlace={place || null}
          royaleKeep={next?.keep ?? 1}
          onPulse={(s) => {
            const now = Date.now();
            if (now - lastPulse.current < 2500) return;
            lastPulse.current = now;
            void pulseRoyale(me.id, me.secret, s).catch(() => {});
          }}
          onFinished={async (r) => {
            try {
              await pulseRoyale(me.id, me.secret, {
                lives: 0,
                combo: 0,
                aura: r.aura,
                alive: true,
                maxCombo: r.maxCombo ?? 0,
              });
            } catch {
              /* last pulse may already be on the host */
            }
          }}
        />
      );
    }
  }

  const move = MOVES[room.round] ?? MOVES[0];
  const submitted = scores.some((s) => s.player_id === me.id && s.round === room.round) || doneRound === room.round;

  if (room.status === "lobby") {
    return (
      <section className="screen col between gap ink scroll">
        <div>
          <p className="kicker">En attente · {code}</p>
          <h1 className="big">Tiens-toi prêt, {me.name}.</h1>
          <p className="lede" style={{ color: "#fff" }}>Le roi du mog lance quand tout le monde a rejoint. Recule, corps entier dans le cadre.</p>
        </div>
        <div className="pills">
          {players.map((p) => (
            <span className={`pill ${p.id === me.id ? "done" : ""}`} key={p.id}>{p.name}</span>
          ))}
        </div>
      </section>
    );
  }

  if (room.status === "preview" || (room.status === "playing" && !submitted)) {
    return (
      <Playfield
        key={move.slug + "-" + room.round}
        move={move}
        muted
        mirrorDefault
        watchFirst
        scoring={room.status === "playing"}
        onFinished={async ({ aura, prec }) => {
          try {
            await submitScore(me.id, me.secret, room.round, aura, prec);
            setDoneRound(room.round);
          } catch (e) {
            setJoinErr(e instanceof Error ? e.message : "Score non envoyé");
          }
        }}
      />
    );
  }

  if (room.status === "playing" && submitted) {
    return (
      <section className="screen col center gap ink">
        <p className="kicker">Move envoyé</p>
        <h1 className="big">Les autres mog encore…</h1>
        <p className="note" style={{ color: "#bbb" }}>{scores.filter((s) => s.round === room.round).length}/{players.length} ont fini</p>
      </section>
    );
  }

  if (room.status === "reveal") {
    const mineScore = scores.find((s) => s.player_id === me.id && s.round === room.round);
    const ranked = scores.filter((s) => s.round === room.round).sort((a, b) => b.aura - a.aura);
    const place = ranked.findIndex((s) => s.player_id === me.id) + 1;
    return (
      <section className="screen col center gap ink scroll">
        <p className="kicker">{move.title}</p>
        <h1 className="big">{place === 1 ? "Roi du mog" : place ? `#${place}` : "En attente"}</h1>
        <p className="lede" style={{ color: "#fff" }}>
          {mineScore ? `${mineScore.aura.toLocaleString("fr-FR")} aura · ${mineScore.prec} %` : "Pas de score sur ce move."}
        </p>
        <p className="note" style={{ color: "#bbb" }}>Regarde l&apos;écran. Le suivant arrive.</p>
      </section>
    );
  }

  const total = scores.filter((s) => s.player_id === me.id).reduce((a, s) => a + s.aura, 0);
  return (
    <section className="screen col center gap redbg scroll">
      <p className="kicker" style={{ color: "#fff" }}>Soirée close</p>
      <h1 className="big">{total.toLocaleString("fr-FR")}</h1>
      <p className="verdict">Ton aura de la soirée. La revanche est un droit sacré.</p>
      <button className="btn" type="button" onClick={() => router.push("/aura")}>Accueil</button>
    </section>
  );
}
