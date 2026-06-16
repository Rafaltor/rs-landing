"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AvatarControls from "./AvatarControls";
import { AvatarScene } from "@/lib/avatar/AvatarScene";
import {
  DEFAULT_AVATAR_CONFIG,
  type AvatarConfig,
} from "@/lib/avatar/palettes";
import {
  ensureMyAvatarPlacement,
  ensureAvatarPlacementsHydrated,
  refreshAvatarPlacementsFromDb,
  removeAvatarPlacement,
  subscribeAvatarPlacements,
  updateAvatarPlacement,
  type AvatarPlacement,
} from "@/lib/avatar/avatarPlacements";
import { useSupabaseAuth } from "@/lib/auth/useSupabaseAuth";
import { openMiiStudio } from "@/lib/landing/miiStudioBus";

type LandingAvatarPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function LandingAvatarPanel({
  open,
  onOpenChange,
}: LandingAvatarPanelProps) {
  const { user, loading: authLoading, configured, signInWithGoogle, signOut } =
    useSupabaseAuth();
  const [placements, setPlacements] = useState<AvatarPlacement[]>([]);
  const [hydrating, setHydrating] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draftConfig, setDraftConfig] = useState<AvatarConfig>(
    DEFAULT_AVATAR_CONFIG,
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AvatarScene | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    let cancelled = false;
    ensureAvatarPlacementsHydrated()
      .then((list) => {
        if (!cancelled) setPlacements(list);
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return subscribeAvatarPlacements((list) => {
      if (!cancelled) setPlacements(list);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshAvatarPlacementsFromDb().catch(() => {});
  }, [user?.id]);

  const myMii = user
    ? placements.find((p) => p.userId === user.id)
    : undefined;

  useEffect(() => {
    if (!open) return;
    if (myMii) {
      setDraftConfig(myMii.config);
    } else {
      setDraftConfig(DEFAULT_AVATAR_CONFIG);
    }
  }, [open, myMii?.id, myMii?.config]);

  useEffect(() => {
    if (!open) {
      sceneRef.current?.dispose();
      sceneRef.current = null;
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    const scene = new AvatarScene(viewport, draftConfig, {
      pixelRatio: 1.6,
      lite: false,
      pauseWhenHidden: false,
    });
    scene.mount();
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    sceneRef.current?.setConfig(draftConfig);
  }, [draftConfig]);

  const persistConfig = useCallback(
    (config: AvatarConfig) => {
      if (!user || !myMii) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateAvatarPlacement(myMii.id, user.id, { config }).catch(() => {});
      }, 450);
    },
    [myMii, user],
  );

  const handleConfigChange = useCallback(
    (config: AvatarConfig) => {
      setDraftConfig(config);
      if (myMii) persistConfig(config);
    },
    [myMii, persistConfig],
  );

  const handleCreate = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      await ensureMyAvatarPlacement(user.id, draftConfig);
    } finally {
      setBusy(false);
    }
  }, [draftConfig, user]);

  const handleRemove = useCallback(async () => {
    if (!user || !myMii) return;
    setBusy(true);
    try {
      await removeAvatarPlacement(myMii.id, user.id);
      setDraftConfig(DEFAULT_AVATAR_CONFIG);
    } finally {
      setBusy(false);
    }
  }, [myMii, user]);

  if (!open) return null;

  return (
    <div
      className="rs-mii-studio-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rs-mii-studio-title"
    >
      <button
        type="button"
        className="rs-mii-studio-overlay__backdrop"
        aria-label="Fermer le studio Mii"
        onClick={() => onOpenChange(false)}
      />

      <div className="rs-mii-studio-modal">
        <header className="rs-mii-studio-modal__header">
          <div>
            <p className="rs-mii-studio-modal__eyebrow">Studio avatar</p>
            <h2 id="rs-mii-studio-title" className="rs-mii-studio-modal__title">
              Créer mon Corporate Mii
            </h2>
            <p className="rs-mii-studio-modal__subtitle">
              Un Mii par compte portail · visible dans le salon 360°
            </p>
          </div>
          <button
            type="button"
            className="rs-mii-studio-modal__close"
            aria-label="Fermer"
            onClick={() => onOpenChange(false)}
          >
            ×
          </button>
        </header>

        <div className="rs-mii-studio-modal__auth">
          {authLoading ? (
            <span className="rs-mii-studio-modal__auth-muted">Session…</span>
          ) : user ? (
            <>
              <span className="rs-mii-studio-modal__auth-email">
                {user.email ?? "Compte Google"}
              </span>
              <button
                type="button"
                className="rs-mii-studio-modal__auth-link"
                onClick={() => signOut()}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <button
              type="button"
              className="rs-mii-studio-modal__google-btn"
              disabled={!configured}
              onClick={() => signInWithGoogle()}
            >
              Continuer avec Google pour créer mon Mii
            </button>
          )}
        </div>

        <div className="rs-mii-studio-modal__body">
          <div className="rs-mii-studio-modal__preview-wrap">
            <div
              ref={viewportRef}
              className="rs-mii-studio-modal__preview"
              aria-hidden="true"
            />
            <p className="rs-mii-studio-modal__preview-hint">Aperçu 3D</p>
          </div>

          <div className="rs-mii-studio-modal__panel">
            {hydrating ? (
              <p className="rs-mii-studio-modal__loading">Chargement…</p>
            ) : !user ? (
              <div className="rs-mii-studio-modal__gate">
                <p>
                  Connectez-vous avec le même compte que le portail pour
                  personnaliser votre Mii et le publier dans le salon.
                </p>
              </div>
            ) : (
              <>
                <AvatarControls cfg={draftConfig} onChange={handleConfigChange} />

                {myMii ? (
                  <div className="rs-mii-studio-modal__actions">
                    <p className="rs-mii-studio-modal__saved">
                      Votre Mii est dans le salon — les changements sont
                      enregistrés automatiquement.
                    </p>
                    <button
                      type="button"
                      className="rs-mii-studio-modal__danger"
                      disabled={busy}
                      onClick={handleRemove}
                    >
                      Retirer du salon
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="rs-mii-studio-modal__create"
                    disabled={busy}
                    onClick={handleCreate}
                  >
                    {busy ? "Publication…" : "Publier mon Mii dans le salon"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
