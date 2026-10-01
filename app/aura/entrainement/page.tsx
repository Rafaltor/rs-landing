"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Playfield, ResultView } from "@/components/aura/Playfield";
import { MOVES } from "@/lib/aura/config";

export default function TrainingPage() {
  const router = useRouter();
  const [key, setKey] = useState(0);
  const [result, setResult] = useState<{ aura: number; prec: number } | null>(null);
  const move = MOVES[0];

  if (result) {
    return (
      <ResultView
        aura={result.aura}
        prec={result.prec}
        onAgain={() => { setResult(null); setKey((k) => k + 1); }}
        onHome={() => router.push("/aura")}
      />
    );
  }

  return (
    <Playfield
      key={key}
      move={move}
      muted={false}
      onFinished={setResult}
    />
  );
}
