"use client";

import { useEffect, useRef, useState } from "react";
import { AvatarScene } from "@/lib/avatar/AvatarScene";
import { getAvatar, setAvatar } from "@/lib/avatar/storage";
import {
  DEFAULT_AVATAR_CONFIG,
  type AvatarConfig,
} from "@/lib/avatar/palettes";
import AvatarControls from "./AvatarControls";

const PERSIST_DEBOUNCE_MS = 320;

export default function AvatarStudio() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AvatarScene | null>(null);
  const [cfg, setCfg] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCfg(getAvatar());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const scene = new AvatarScene(viewport, getAvatar(), {
      pixelRatio: 2,
      lite: false,
      pauseWhenHidden: true,
    });
    scene.mount();
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    sceneRef.current?.setConfig(cfg);

    const timer = window.setTimeout(() => {
      setAvatar(cfg);
    }, PERSIST_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [cfg, hydrated]);

  if (!hydrated) {
    return (
      <div className="rs-avatar-studio">
        <div className="rs-avatar-studio__viewport" />
        <aside className="rs-avatar-controls rs-avatar-controls--loading" aria-busy>
          Chargement…
        </aside>
      </div>
    );
  }

  return (
    <div className="rs-avatar-studio">
      <div ref={viewportRef} className="rs-avatar-studio__viewport" />
      <AvatarControls cfg={cfg} onChange={setCfg} />
    </div>
  );
}
