"use client";

import {
  COLOR_PROFILES,
  hexToCss,
  hexToHue,
  hueColorFromSlider,
  hueRampGradient,
  randomHueColor,
  randomSkinColor,
  skinHexFromSlider,
  skinRampGradient,
  skinSliderFromHex,
} from "@/lib/avatar/avatarColors";
import { PSEUDO_MAX_LENGTH } from "@/lib/avatar/avatarConfig";
import {
  ACCS,
  EYESL,
  HAIRS,
  NOSES,
  paletteIndex,
  type AvatarConfig,
} from "@/lib/avatar/palettes";

type AvatarControlsProps = {
  cfg: AvatarConfig;
  onChange: (next: AvatarConfig) => void;
  embedded?: boolean;
  showHeader?: boolean;
  variant?: "dark" | "light";
};

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function randomConfig(): AvatarConfig {
  const suit = randomHueColor(COLOR_PROFILES.suit);
  const r = (n: number) => Math.floor(Math.random() * n);
  return {
    skin: randomSkinColor(),
    hair: r(HAIRS.length),
    hairColor: randomHueColor(COLOR_PROFILES.hair),
    eyes: r(EYESL.length),
    nose: r(NOSES.length),
    glasses: Math.random() > 0.5,
    suit,
    pants: randomHueColor(COLOR_PROFILES.pants),
    shirt: randomHueColor(COLOR_PROFILES.shirt),
    acc: r(ACCS.length),
    accColor: randomHueColor(COLOR_PROFILES.accent),
    pseudo: "",
  };
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

type SkinSliderProps = {
  id: string;
  label: string;
  value: number;
  onChange: (hex: number) => void;
};

function SkinSlider({ id, label, value, onChange }: SkinSliderProps) {
  const sliderVal = skinSliderFromHex(value);
  return (
    <div className="rs-avatar-controls__row rs-avatar-controls__row--color">
      <span className="rs-avatar-controls__label" id={`${id}-label`}>
        {label}
      </span>
      <div className="rs-avatar-controls__color-field">
        <span
          className="rs-avatar-controls__color-preview"
          style={{ backgroundColor: hexToCss(value) }}
          aria-hidden
        />
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={sliderVal}
          aria-labelledby={`${id}-label`}
          aria-valuenow={sliderVal}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={hexToCss(value)}
          className="rs-avatar-controls__color-slider"
          style={{ background: skinRampGradient() }}
          onChange={(e) => onChange(skinHexFromSlider(Number(e.target.value)))}
        />
      </div>
    </div>
  );
}

type HueSliderProps = {
  id: string;
  label: string;
  value: number;
  profile: (typeof COLOR_PROFILES)[keyof typeof COLOR_PROFILES];
  onChange: (hex: number) => void;
};

function HueSlider({ id, label, value, profile, onChange }: HueSliderProps) {
  const sliderVal = hexToHue(value);
  return (
    <div className="rs-avatar-controls__row rs-avatar-controls__row--color">
      <span className="rs-avatar-controls__label" id={`${id}-label`}>
        {label}
      </span>
      <div className="rs-avatar-controls__color-field">
        <span
          className="rs-avatar-controls__color-preview"
          style={{ backgroundColor: hexToCss(value) }}
          aria-hidden
        />
        <input
          id={id}
          type="range"
          min={0}
          max={360}
          step={1}
          value={sliderVal}
          aria-labelledby={`${id}-label`}
          aria-valuenow={sliderVal}
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuetext={hexToCss(value)}
          className="rs-avatar-controls__color-slider"
          style={{ background: hueRampGradient() }}
          onChange={(e) =>
            onChange(hueColorFromSlider(Number(e.target.value), profile))
          }
        />
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
    key: "hair" | "eyes" | "nose" | "acc",
    length: number,
    delta: number,
  ) => {
    const current = cfg[key] as number;
    patch({ [key]: (current + delta + length) % length });
  };

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
        <h3 className="rs-avatar-controls__section-title">Profil</h3>
        <div className="rs-avatar-controls__row rs-avatar-controls__row--field">
          <label className="rs-avatar-controls__label" htmlFor="rs-avatar-pseudo">
            Pseudo
          </label>
          <input
            id="rs-avatar-pseudo"
            type="text"
            className="rs-avatar-controls__input"
            value={cfg.pseudo}
            maxLength={PSEUDO_MAX_LENGTH}
            placeholder="Ton pseudo"
            autoComplete="nickname"
            onChange={(e) => patch({ pseudo: e.target.value })}
          />
        </div>
      </section>

      <section className="rs-avatar-controls__section">
        <h3 className="rs-avatar-controls__section-title">Silhouette</h3>
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
        <SkinSlider
          id="rs-avatar-skin"
          label="Peau"
          value={cfg.skin}
          onChange={(skin) => patch({ skin })}
        />
        <HueSlider
          id="rs-avatar-hair"
          label="Cheveux"
          value={cfg.hairColor}
          profile={COLOR_PROFILES.hair}
          onChange={(hairColor) => patch({ hairColor })}
        />
        <HueSlider
          id="rs-avatar-suit"
          label="Haut (veste)"
          value={cfg.suit}
          profile={COLOR_PROFILES.suit}
          onChange={(suit) => patch({ suit })}
        />
        <HueSlider
          id="rs-avatar-pants"
          label="Bas (pantalon)"
          value={cfg.pants}
          profile={COLOR_PROFILES.pants}
          onChange={(pants) => patch({ pants })}
        />
        <HueSlider
          id="rs-avatar-shirt"
          label="Chemise"
          value={cfg.shirt}
          profile={COLOR_PROFILES.shirt}
          onChange={(shirt) => patch({ shirt })}
        />
        <HueSlider
          id="rs-avatar-accent"
          label="Accent"
          value={cfg.accColor}
          profile={COLOR_PROFILES.accent}
          onChange={(accColor) => patch({ accColor })}
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
          onClick={() => onChange({ ...randomConfig(), pseudo: cfg.pseudo })}
        >
          Aléatoire
        </button>
      </section>
    </aside>
  );
}
