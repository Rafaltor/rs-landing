"use client";

import { useEffect, useState, type RefObject } from "react";

type GyroscopeButtonProps = {
  viewerRef: RefObject<PannellumViewer | null>;
  viewerReady: boolean;
};

export default function GyroscopeButton({
  viewerRef,
  viewerReady,
}: GyroscopeButtonProps) {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => {
      const viewer = viewerRef.current;
      const supported =
        viewerReady &&
        typeof DeviceOrientationEvent !== "undefined" &&
        (viewer?.isOrientationSupported?.() ?? false);
      setVisible(mq.matches && supported);
      setActive(viewer?.isOrientationActive?.() ?? false);
    };

    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [viewerRef, viewerReady]);

  const toggle = () => {
    const viewer = viewerRef.current;
    if (!viewer?.isOrientationSupported?.()) return;

    if (viewer.isOrientationActive?.()) {
      viewer.stopOrientation?.();
      setActive(false);
      return;
    }

    viewer.startOrientation?.();
    window.setTimeout(() => {
      setActive(viewer.isOrientationActive?.() ?? false);
    }, 350);
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      className={`rs-gyro-btn${active ? " rs-gyro-btn--active" : ""}`}
      onClick={toggle}
      aria-pressed={active}
      aria-label={
        active
          ? "Désactiver le suivi du téléphone"
          : "Activer le suivi du téléphone"
      }
    >
      <span className="rs-gyro-btn__icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect
            x="7"
            y="2"
            width="10"
            height="20"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle cx="12" cy="18" r="1.25" fill="currentColor" />
          <path
            d="M9 6h6M9 9h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            className="rs-gyro-btn__pulse"
            d="M12 2v-1M16 3l1-1M8 3L7 2M19 12h1M4 12H3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="rs-gyro-btn__copy">
        <span className="rs-gyro-btn__title">
          {active ? "Suivi actif" : "Suivre le téléphone"}
        </span>
        <span className="rs-gyro-btn__sub">
          {active ? "Bougez pour regarder" : "Mode gyroscope"}
        </span>
      </span>
    </button>
  );
}
