"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import dynamic from "next/dynamic";
import PanoramaHint from "./PanoramaHint";
import MiiDock from "./MiiDock";
import { registerMiiStudioHandlers } from "@/lib/landing/miiStudioBus";

const PannellumViewer = dynamic(() => import("./PannellumViewer"), {
  ssr: false,
});

const LandingAvatarPanel = dynamic(() => import("./LandingAvatarPanel"), {
  ssr: false,
});

export default function LandingScene() {
  const [miiStudioOpen, setMiiStudioOpen] = useState(false);

  useLayoutEffect(() => {
    return registerMiiStudioHandlers({
      open: () => setMiiStudioOpen(true),
      close: () => setMiiStudioOpen(false),
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("studio") !== "mii") return;

    queueMicrotask(() => setMiiStudioOpen(true));
    params.delete("studio");
    const qs = params.toString();
    const cleanUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState(null, "", cleanUrl);
  }, []);

  return (
    <>
      <PannellumViewer />
      <PanoramaHint />
      <MiiDock onOpen={() => setMiiStudioOpen(true)} />
      <LandingAvatarPanel
        open={miiStudioOpen}
        onOpenChange={setMiiStudioOpen}
      />
    </>
  );
}
