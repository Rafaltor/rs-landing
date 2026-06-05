"use client";

import dynamic from "next/dynamic";
import PanoramaHint from "./PanoramaHint";

const PannellumViewer = dynamic(() => import("./PannellumViewer"), {
  ssr: false,
});

export default function LandingScene() {
  return (
    <>
      <PannellumViewer />
      <PanoramaHint />
    </>
  );
}
