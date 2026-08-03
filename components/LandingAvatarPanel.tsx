"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AvatarControls from "./AvatarControls";
import { AvatarScene } from "@/lib/avatar/AvatarScene";
import {
  DEFAULT_AVATAR_CONFIG,
  type AvatarConfig,
} from "@/lib/avatar/palettes";
import { normalizePseudo } from "@/lib/avatar/avatarConfig";
import { getAvatar, setAvatar } from "@/lib/avatar/storage";
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
import { BRAND_COPY } from "@/lib/branding/copy";

const PENDING_DEPOSIT_KEY = "rs-pending-deposit";

type LandingAvatarPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function readInitialDraft(): AvatarConfig {
  if (typeof window === "undefined") return DEFAULT_AVATAR_CONFIG;
  return getAvatar();
}

export default function LandingAvatarPanel({
  open,
  onOpenChange,
}: LandingAvatarPanelProps) {
  const { user, loading: authLoading, configured, signInWithGoogle, signOut } =
    useSupabaseAuth();
  const [placements, setPlacements] = useState<AvatarPlacement[]>([]);
  const [hydrating, setHydrating] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draftConfig, setDraftConfig] = useState<AvatarConfig>(readInitialDraft);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDepositRef = useRef(false);
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
      const local = getAvatar();
      setDraftConfig({
        ...myMii.config,
        pseudo: normalizePseudo(myMii.config.pseudo || local.pseudo),
      });
    } else {
      setDraftConfig(getAvatar());
    }
  }, [open, myMii?.id, myMii?.config.pseudo]);

  // Le contexte WebGL du studio n'est créé qu'à la PREMIÈRE ouverture : au
  // chargement de la page, seuls Pannellum + le stage des Miis existent, ce qui
  // garantit que Pannellum obtient son contexte en priorité.
  useEffect(() => {
    if (!open) {
      sceneRef.current?.pause();
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (!sceneRef.current) {
      const scene = new AvatarScene(viewport, draftConfig, {
        pixelRatio: 2,
        lite: true,
        pauseWhenHidden: false,
        orbit: true,
      });
      scene.mount();
      sceneRef.current = scene;
    } else {
      sceneRef.current.resume();
    }
    sceneRef.current.setConfig(draftConfig);
  }, [open]);

  useEffect(() => {
    if (!open || !sceneRef.current) return;
    sceneRef.current.setConfig(draftConfig);
  }, [draftConfig, open]);

  useEffect(() => {
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const persistToSalon = useCallback(
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
      setAvatar(config);
      if (myMii) persistToSalon(config);
    },
    [myMii, persistToSalon],
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

  const handleDeposit = useCallback(() => {
    if (!configured || busy) return;

    if (!user) {
      try {
        sessionStorage.setItem(PENDING_DEPOSIT_KEY, "1");
      } catch {
        // sessionStorage indisponible — le brouillon local reste dans getAvatar()
      }
      signInWithGoogle();
      return;
    }

    void handleCreate();
  }, [busy, configured, handleCreate, signInWithGoogle, user]);

  useEffect(() => {
    if (!user || authLoading || hydrating || myMii || busy) return;
    if (pendingDepositRef.current) return;

    let pending = false;
    try {
      pending = sessionStorage.getItem(PENDING_DEPOSIT_KEY) === "1";
    } catch {
      pending = false;
    }
    if (!pending) return;

    pendingDepositRef.current = true;
    try {
      sessionStorage.removeItem(PENDING_DEPOSIT_KEY);
    } catch {
      // ignore
    }

    void (async () => {
      setBusy(true);
      try {
        await ensureMyAvatarPlacement(user.id, getAvatar());
      } finally {
        setBusy(false);
        pendingDepositRef.current = false;
      }
    })();
  }, [user, authLoading, hydrating, myMii, busy]);

  const handleRemove = useCallback(async () => {
    if (!user || !myMii) return;
    setBusy(true);
    try {
      await removeAvatarPlacement(myMii.id, user.id);
      setDraftConfig(getAvatar());
    } finally {
      setBusy(false);
    }
  }, [myMii, user]);

  const depositDisabled = busy || !configured;
  const depositLabel = busy
    ? BRAND_COPY.depositBusy
    : !configured
      ? BRAND_COPY.depositUnavailable
      : BRAND_COPY.deposit;

  return (
    <div
      className={`rs-mii-studio-overlay${open ? "" : " rs-mii-studio-overlay--closed"}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-labelledby="rs-mii-studio-title"
    >
      <button
        type="button"
        className="rs-mii-studio-overlay__backdrop"
        aria-label="Fermer le configurateur"
        onClick={() => onOpenChange(false)}
      />

      <div className="rs-mii-studio-modal">
        <header className="rs-mii-studio-modal__header">
          <div>
            <p className="rs-mii-studio-modal__eyebrow">{BRAND_COPY.modalEyebrow}</p>
            <h2 id="rs-mii-studio-title" className="rs-mii-studio-modal__title">
              {BRAND_COPY.modalTitle}
            </h2>
            <p className="rs-mii-studio-modal__subtitle">
              {BRAND_COPY.modalSubtitle}
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
              Continuer avec Google
            </button>
          )}
        </div>

        <div className="rs-mii-studio-modal__body">
          <div className="rs-mii-studio-modal__preview-wrap">
            <div
              ref={viewportRef}
              className="rs-mii-studio-modal__preview rs-mii-studio-modal__preview--orbit"
              aria-hidden="true"
            />
            <p className="rs-mii-studio-modal__preview-hint">
              {BRAND_COPY.previewHint}
            </p>
          </div>

          <div className="rs-mii-studio-modal__panel">
            {hydrating ? (
              <p className="rs-mii-studio-modal__loading">Chargement…</p>
            ) : (
              <>
                <AvatarControls
                  cfg={draftConfig}
                  onChange={handleConfigChange}
                  variant="light"
                />

                {myMii ? (
                  <div className="rs-mii-studio-modal__actions">
                    <p className="rs-mii-studio-modal__saved">
                      {BRAND_COPY.savedInSalon}
                    </p>
                    <button
                      type="button"
                      className="rs-mii-studio-modal__danger"
                      disabled={busy}
                      onClick={handleRemove}
                    >
                      {BRAND_COPY.removeFromSalon}
                    </button>
                  </div>
                ) : (
                  <div className="rs-mii-studio-modal__actions">
                    {!configured ? (
                      <p className="rs-mii-studio-modal__saved">
                        {BRAND_COPY.unavailableDeposit}
                      </p>
                    ) : !user ? (
                      <p className="rs-mii-studio-modal__saved">
                        {BRAND_COPY.loginToDeposit}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="rs-mii-studio-modal__create"
                      disabled={depositDisabled}
                      title={
                        !configured
                          ? BRAND_COPY.salonUnavailable
                          : undefined
                      }
                      aria-label={
                        !configured
                          ? `${BRAND_COPY.deposit} — indisponible`
                          : BRAND_COPY.deposit
                      }
                      onClick={handleDeposit}
                    >
                      {depositLabel}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
