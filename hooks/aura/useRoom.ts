"use client";

import { useEffect, useState } from "react";
import type { Player, Room, RoyaleState, Score } from "@/lib/aura/room";
import { fetchPlayers, fetchRoom, fetchRoyale, fetchScores } from "@/lib/aura/room";
import { getSupabase } from "@/lib/aura/supabase";

export function useRoom(code: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [royale, setRoyale] = useState<RoyaleState[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    let stop = false;
    let royaleWait = 0;
    const sb = getSupabase();
    let channel: ReturnType<typeof sb.channel> | null = null;

    (async () => {
      try {
        const r = await fetchRoom(code);
        if (!r) {
          if (!stop) setError("Salon introuvable.");
          return;
        }
        const [p, s, ry] = await Promise.all([fetchPlayers(r.id), fetchScores(r.id), fetchRoyale(r.id).catch(() => [] as RoyaleState[])]);
        if (stop) return;
        setRoom(r);
        setPlayers(p);
        setScores(s);
        setRoyale(ry);
        channel = sb
          .channel("aura-" + r.id)
          .on("postgres_changes", { event: "*", schema: "public", table: "aura_rooms", filter: `id=eq.${r.id}` }, (payload) => {
            setRoom((cur) => {
              const next = payload.new as Partial<Room> | null;
              if (!next) return cur;
              const mode = next.mode || cur?.mode || "classic";
              return { ...(cur ?? {}), ...next, mode } as Room;
            });
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "aura_players", filter: `room_id=eq.${r.id}` }, async () => {
            if (!stop) setPlayers(await fetchPlayers(r.id));
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "aura_scores", filter: `room_id=eq.${r.id}` }, async () => {
            if (!stop) setScores(await fetchScores(r.id));
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "aura_royale", filter: `room_id=eq.${r.id}` }, () => {
            if (royaleWait) return;
            royaleWait = window.setTimeout(async () => {
              royaleWait = 0;
              if (!stop) setRoyale(await fetchRoyale(r.id).catch(() => [] as RoyaleState[]));
            }, 400);
          })
          .subscribe();
      } catch (e) {
        if (!stop) setError(e instanceof Error ? e.message : "Connexion salon impossible");
      }
    })();

    return () => {
      stop = true;
      window.clearTimeout(royaleWait);
      if (channel) sb.removeChannel(channel);
    };
  }, [code]);

  return { room, players, scores, royale, error, setError };
}
