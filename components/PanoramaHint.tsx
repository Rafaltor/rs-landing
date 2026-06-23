"use client";

import { useEffect, useState } from "react";

const DISMISS_MS = 5000;
const FADE_MS = 600;

export default function PanoramaHint() {
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">("visible");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (phase !== "visible") return;

    const dismiss = () => setPhase("fading");

    const timer = window.setTimeout(dismiss, DISMISS_MS);
    window.addEventListener("pointerdown", dismiss, { once: true });
    window.addEventListener("wheel", dismiss, { once: true });

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "fading") return;

    const timer = window.setTimeout(() => setPhase("hidden"), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`rs-panorama-hint${phase === "fading" ? " rs-panorama-hint--fade" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="rs-panorama-hint__pill">
        <span className="rs-panorama-hint__icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path
              d="M8 14H20M8 14L11 11M8 14L11 17"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rs-panorama-hint__arrow rs-panorama-hint__arrow--left"
            />
            <path
              d="M20 14H8M20 14L17 11M20 14L17 17"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rs-panorama-hint__arrow rs-panorama-hint__arrow--right"
            />
            <circle cx="14" cy="14" r="2.25" fill="currentColor" opacity="0.85" />
          </svg>
        </span>
        <span className="rs-panorama-hint__copy">
          <span className="rs-panorama-hint__title">Glissez pour explorer</span>
          <span className="rs-panorama-hint__sub">
            {isMobile
              ? "Pincez pour zoomer · studio sur le mur de droite"
              : "Molette pour zoomer · panneau Mon stagiaire sur le mur de droite"}
          </span>
          <span className="rs-panorama-hint__tag">Vue 360°</span>
        </span>
      </div>
    </div>
  );
}
