"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function join(e: React.FormEvent) {
    e.preventDefault();
    const c = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (c.length < 4) {
      setError("Entre le code du salon (6 lettres).");
      return;
    }
    const n = name.trim() || "NPC";
    router.push(`/aura/jouer/${c}?nom=${encodeURIComponent(n)}`);
  }

  return (
    <section className="screen col between scroll">
      <div>
        <h1 className="title">Just<br />Aura</h1>
        <p className="lede">Rejoins le salon du roi du mog. 15 manches, ou Battle Royale live : pas de démo, reste haut au classement ou t&apos;es out.</p>
      </div>
      <form className="controls" onSubmit={join}>
        <label className="field">
          Code du salon
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={8}
            placeholder="K7MPQ2"
            enterKeyHint="next"
          />
        </label>
        <label className="field">
          Ton nom de mog
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="Lowtaperdu"
            enterKeyHint="go"
          />
        </label>
        <button className="btn" type="submit">Rejoindre</button>
        <Link href="/aura/entrainement" className="btn secondary">Entraînement solo</Link>
        <p className="error" role="alert">{error}</p>
        <p className="note">Tout se passe sur ton téléphone : ta vidéo n&apos;est ni enregistrée ni envoyée.</p>
        <p className="note"><Link href="/aura/hote" className="linkbtn">Écran hôte</Link> · <Link href="/" className="linkbtn">Salon 360°</Link></p>
      </form>
    </section>
  );
}
