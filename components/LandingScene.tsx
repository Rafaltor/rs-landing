"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import dynamic from "next/dynamic";
import PanoramaHint from "./PanoramaHint";
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

  return (
    <>
      <PannellumViewer />
      <PanoramaHint />
      <LandingAvatarPanel
        open={miiStudioOpen}
        onOpenChange={setMiiStudioOpen}
      />
    </>
  );
}
