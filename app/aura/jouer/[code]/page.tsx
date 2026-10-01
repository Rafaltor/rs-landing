"use client";

import { Suspense, use } from "react";
import { PlayerRoom } from "@/components/aura/PlayerRoom";

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return (
    <Suspense fallback={<Wait />}>
      <PlayerRoom code={code.toUpperCase()} />
    </Suspense>
  );
}

function Wait() {
  return (
    <section className="screen col center gap">
      <p className="kicker">Loi de la jungle</p>
      <h1 className="big">On entre dans le salon…</h1>
    </section>
  );
}
