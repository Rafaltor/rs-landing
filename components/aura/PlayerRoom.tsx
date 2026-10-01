"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Playfield } from "@/components/aura/Playfield";
import { MOVES } from "@/lib/aura/config";
import { joinRoom, makeSecret, submitScore } from "@/lib/aura/room";
import { useRoom } from "@/hooks/aura/useRoom";

type Me = { id: string; secret: string; name: string; code: string };

function subscribe() {
  return () => {};
}

function readPlayer(code: string) {
  try {
    return sessionStorage.getItem("aura-player-" + code);
  } catch {
    return null;
  }
}

export function PlayerRoom({ code }: { code: string }) {
  const q = useSearchParams();
  const router = useRouter();
  const name = q.get("nom") || "NPC";
  const { room, players, scores, error } = useRoom(code);
  const savedRaw = useSyncExternalStore(subscribe, () => readPlayer(code), () => null);
  const saved = savedRaw ? (JSON.parse(savedRaw) as Me) : null;
  const [joinedMe, setJoinedMe] = useState<Me | null>(null);
  const [joinErr, setJoinErr] = useState("");
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
        sessionStorage.setItem("aura-player-" + code, JSON.stringify(m));
        setJoinedMe(m);
      } catch (e) {
        setJoinErr(e instanceof Error ? e.message : "Impossible de rejoindre");
      }
    })();
  }, [code, name, me]);

  if (joinErr || error) {
    return (
      <section className="screen col center gap">
        <p className="kicker">Aura loss</p>
        <h1 className="big">{joinErr || error}</h1>
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

  if (room.status === "playing" && !submitted) {
    return (
      <Playfield
        key={move.slug + room.round}
        move={move}
        muted
        mirrorDefault
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
        <h1 className="big">Les autres moguent encore…</h1>
        <p className="note" style={{ color: "#bbb" }}>{scores.filter((s) => s.round === room.round).length}/{players.length} ont fini</p>
      </section>
    );
  }

  if (room.status === "reveal") {
    const mine = scores.find((s) => s.player_id === me.id && s.round === room.round);
    const ranked = scores.filter((s) => s.round === room.round).sort((a, b) => b.aura - a.aura);
    const place = ranked.findIndex((s) => s.player_id === me.id) + 1;
    return (
      <section className="screen col center gap ink scroll">
        <p className="kicker">{move.title}</p>
        <h1 className="big">{place === 1 ? "Roi du mog" : place ? `#${place}` : "En attente"}</h1>
        <p className="lede" style={{ color: "#fff" }}>
          {mine ? `${mine.aura.toLocaleString("fr-FR")} aura · ${mine.prec} %` : "Pas de score sur ce move."}
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
