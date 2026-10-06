"use client";

import { useEffect, useState } from "react";
import type { Player, Room, RoyaleState, Score } from "@/lib/aura/room";
import { fetchPlayers, fetchRoom, fetchRoyale, fetchScores } from "@/lib/aura/room";
import { getSupabase } from "@/lib/aura/supabase";

export function useRoom(code: string | null, opts?: { host?: boolean; retry?: number }) {
  const host = opts?.host ?? false;
  const retry = opts?.retry ?? 0;
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [royale, setRoyale] = useState<RoyaleState[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    let stop = false;
    let boardWait = 0;
    const sb = getSupabase();
    let channel: ReturnType<typeof sb.channel> | null = null;
    let poll = 0;

    const pullBoard = (id: string, wait: number) => {
      if (boardWait) return;
      boardWait = window.setTimeout(async () => {
        boardWait = 0;
        if (stop) return;
        try {
          const [s, ry] = await Promise.all([
            fetchScores(id),
            fetchRoyale(id).catch(() => [] as RoyaleState[]),
          ]);
          if (stop) return;
          setScores(s);
          setRoyale(ry);
        } catch {
          /* garde le dernier classement si le réseau cale */
        }
      }, wait);
    };

    (async () => {
      for (let attempt = 0; attempt < 4 && !stop; attempt++) {
        try {
          const r = await fetchRoom(code);
          if (stop) return;
          if (!r) {
            setError("Salon introuvable.");
            return;
          }
          const [p, s, ry] = await Promise.all([
            fetchPlayers(r.id),
            fetchScores(r.id),
            fetchRoyale(r.id).catch(() => [] as RoyaleState[]),
          ]);
          if (stop) return;
          setRoom(r);
          setPlayers(p);
          setScores(s);
          setRoyale(ry);
          setError("");

          channel = sb
            .channel(`aura-${r.id}-${host ? "h" : "p"}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "aura_rooms", filter: `id=eq.${r.id}` }, (payload) => {
              setRoom((cur) => {
                const next = payload.new as Partial<Room> | null;
                if (!next) return cur;
                const mode = next.mode || cur?.mode || "classic";
                return { ...(cur ?? {}), ...next, mode } as Room;
              });
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "aura_players", filter: `room_id=eq.${r.id}` }, () => {
              fetchPlayers(r.id).then((rows) => {
                if (!stop) setPlayers(rows);
              }).catch(() => {});
            });

          if (host) {
            channel
              .on("postgres_changes", { event: "*", schema: "public", table: "aura_scores", filter: `room_id=eq.${r.id}` }, () => pullBoard(r.id, 1000))
              .on("postgres_changes", { event: "*", schema: "public", table: "aura_royale", filter: `room_id=eq.${r.id}` }, () => pullBoard(r.id, 1000));
          }

          if (stop) {
            sb.removeChannel(channel);
            channel = null;
            return;
          }
          channel.subscribe();

          if (!host) {
            poll = window.setInterval(() => pullBoard(r.id, 0), 2000);
          }
          return;
        } catch (e) {
          if (attempt === 3 && !stop) setError(e instanceof Error ? e.message : "Connexion salon impossible");
          else await new Promise((res) => window.setTimeout(res, 700 * (attempt + 1)));
        }
      }
    })();

    return () => {
      stop = true;
      window.clearTimeout(boardWait);
      if (poll) window.clearInterval(poll);
      if (channel) sb.removeChannel(channel);
    };
  }, [code, host, retry]);

  return { room, players, scores, royale, error, setError };
}
