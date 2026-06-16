"use client";

import {
  ACCC,
  ACCS,
  BODIES,
  EYESL,
  HAIRC,
  HAIRS,
  NOSES,
  SHIRT,
  SKIN,
  SUIT,
  paletteIndex,
  type AvatarConfig,
} from "@/lib/avatar/palettes";

type AvatarControlsProps = {
  cfg: AvatarConfig;
  onChange: (next: AvatarConfig) => void;
  /** Intégré dans le panneau landing (pas le studio plein écran). */
  embedded?: boolean;
  showHeader?: boolean;
  /** Thème clair pour le modal RS. */
  variant?: "dark" | "light";
};

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function randomConfig(): AvatarConfig {
  return {
    body: randomInt(BODIES.length),
    skin: randomInt(SKIN.length),
    hair: randomInt(HAIRS.length),
    hairColor: randomInt(HAIRC.length),
    eyes: randomInt(EYESL.length),
    nose: randomInt(NOSES.length),
    glasses: Math.random() > 0.5,
    suit: randomInt(SUIT.length),
    shirt: randomInt(SHIRT.length),
    acc: randomInt(ACCS.length),
    accColor: randomInt(ACCC.length),
  };
}

function hexColor(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

type CyclerProps = {
  label: string;
  valueLabel: string;
  onPrev: () => void;
  onNext: () => void;
};

function Cycler({ label, valueLabel, onPrev, onNext }: CyclerProps) {
  return (
    <div className="rs-avatar-controls__row">
      <span className="rs-avatar-controls__label">{label}</span>
      <div className="rs-avatar-controls__cycler">
        <button
          type="button"
          className="rs-avatar-controls__cycle-btn"
          onClick={onPrev}
          aria-label={`${label} précédent`}
        >
          ◀
        </button>
        <span className="rs-avatar-controls__value">{valueLabel}</span>
        <button
          type="button"
          className="rs-avatar-controls__cycle-btn"
          onClick={onNext}
          aria-label={`${label} suivant`}
        >
          ▶
        </button>
      </div>
    </div>
  );
}

type SwatchRowProps = {
  label: string;
  colors: readonly number[];
  selected: number;
  onSelect: (index: number) => void;
  name: string;
};

function SwatchRow({
  label,
  colors,
  selected,
  onSelect,
  name,
}: SwatchRowProps) {
  const active = paletteIndex(colors, selected);

  return (
    <div className="rs-avatar-controls__row rs-avatar-controls__row--swatches">
      <span className="rs-avatar-controls__label">{label}</span>
      <div
        className="rs-avatar-controls__swatches"
        role="radiogroup"
        aria-label={label}
      >
        {colors.map((color, index) => (
          <button
            key={`${name}-${color}-${index}`}
            type="button"
            role="radio"
            aria-checked={index === active}
            aria-label={`${label} ${hexColor(color)}`}
            className={`rs-avatar-controls__swatch${
              index === active ? " rs-avatar-controls__swatch--active" : ""
            }`}
            style={{ backgroundColor: hexColor(color) }}
            onClick={() => onSelect(index)}
          />
        ))}
      </div>
    </div>
  );
}

export default function AvatarControls({
  cfg,
  onChange,
  embedded = false,
  showHeader = true,
  variant = "dark",
}: AvatarControlsProps) {
  const patch = (partial: Partial<AvatarConfig>) => {
    onChange({ ...cfg, ...partial });
  };

  const cycleIndex = (
    key: "body" | "hair" | "eyes" | "nose" | "acc",
    length: number,
    delta: number,
  ) => {
    const current = cfg[key] as number;
    patch({ [key]: (current + delta + length) % length });
  };

  const bodyIdx = paletteIndex(BODIES, cfg.body);
  const hairIdx = paletteIndex(HAIRS, cfg.hair);
  const eyesIdx = paletteIndex(EYESL, cfg.eyes);
  const noseIdx = paletteIndex(NOSES, cfg.nose);
  const accIdx = paletteIndex(ACCS, cfg.acc);

  const controlClass = [
    "rs-avatar-controls",
    embedded ? "rs-avatar-controls--embedded" : "",
    variant === "light" ? "rs-avatar-controls--light" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={controlClass} aria-label="Personnalisation avatar">
      {showHeader && (
        <header className="rs-avatar-controls__header">
          <h2 className="rs-avatar-controls__title">Corporate Stagiaire</h2>
          <p className="rs-avatar-controls__subtitle">Studio avatar</p>
        </header>
      )}

      <section className="rs-avatar-controls__section">
        <h3 className="rs-avatar-controls__section-title">Silhouette</h3>
        <Cycler
          label="Silhouette"
          valueLabel={BODIES[bodyIdx]}
          onPrev={() => cycleIndex("body", BODIES.length, -1)}
          onNext={() => cycleIndex("body", BODIES.length, 1)}
        />
        <Cycler
          label="Coiffure"
          valueLabel={formatLabel(HAIRS[hairIdx])}
          onPrev={() => cycleIndex("hair", HAIRS.length, -1)}
          onNext={() => cycleIndex("hair", HAIRS.length, 1)}
        />
        <Cycler
          label="Yeux"
          valueLabel={formatLabel(EYESL[eyesIdx])}
          onPrev={() => cycleIndex("eyes", EYESL.length, -1)}
          onNext={() => cycleIndex("eyes", EYESL.length, 1)}
        />
        <Cycler
          label="Nez"
          valueLabel={formatLabel(NOSES[noseIdx])}
          onPrev={() => cycleIndex("nose", NOSES.length, -1)}
          onNext={() => cycleIndex("nose", NOSES.length, 1)}
        />
        <Cycler
          label="Accessoire"
          valueLabel={formatLabel(ACCS[accIdx])}
          onPrev={() => cycleIndex("acc", ACCS.length, -1)}
          onNext={() => cycleIndex("acc", ACCS.length, 1)}
        />
      </section>

      <section className="rs-avatar-controls__section">
        <h3 className="rs-avatar-controls__section-title">Couleurs</h3>
        <SwatchRow
          label="Peau"
          name="skin"
          colors={SKIN}
          selected={cfg.skin}
          onSelect={(index) => patch({ skin: index })}
        />
        <SwatchRow
          label="Cheveux"
          name="hair"
          colors={HAIRC}
          selected={cfg.hairColor}
          onSelect={(index) => patch({ hairColor: index })}
        />
        <SwatchRow
          label="Costume"
          name="suit"
          colors={SUIT}
          selected={cfg.suit}
          onSelect={(index) => patch({ suit: index })}
        />
        <SwatchRow
          label="Chemise"
          name="shirt"
          colors={SHIRT}
          selected={cfg.shirt}
          onSelect={(index) => patch({ shirt: index })}
        />
        <SwatchRow
          label="Accent"
          name="accent"
          colors={ACCC}
          selected={cfg.accColor}
          onSelect={(index) => patch({ accColor: index })}
        />
      </section>

      <section className="rs-avatar-controls__section">
        <div className="rs-avatar-controls__row">
          <span className="rs-avatar-controls__label">Lunettes</span>
          <button
            type="button"
            role="switch"
            aria-checked={cfg.glasses}
            aria-label="Activer les lunettes"
            className={`rs-avatar-controls__toggle${
              cfg.glasses ? " rs-avatar-controls__toggle--on" : ""
            }`}
            onClick={() => patch({ glasses: !cfg.glasses })}
          >
            <span className="rs-avatar-controls__toggle-knob" />
            <span className="rs-avatar-controls__toggle-text">
              {cfg.glasses ? "Oui" : "Non"}
            </span>
          </button>
        </div>

        <button
          type="button"
          className="rs-avatar-controls__random"
          aria-label="Générer un avatar aléatoire"
          onClick={() => onChange(randomConfig())}
        >
          Aléatoire
        </button>
      </section>
    </aside>
  );
}
