"use client";

import Link from "next/link";

export default function AuraHero() {
  return (
    <div className="rs-aura-hero">
      <Link href="/aura" className="rs-aura-hero__card">
        <span className="rs-aura-hero__kicker">Ce soir · live</span>
        <span className="rs-aura-hero__title">Aura Dance</span>
        <span className="rs-aura-hero__lede">
          Just Dance version aura. Rejoins le salon, mogue, que la loi de la jungle tranche.
        </span>
        <span className="rs-aura-hero__cta">Entrer dans le mog</span>
      </Link>
    </div>
  );
}
