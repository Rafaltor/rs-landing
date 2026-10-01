"use client";

import { BRAND_COPY } from "@/lib/branding/copy";

export default function MiiDock({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="rs-mii-dock"
      onClick={onOpen}
      aria-label={BRAND_COPY.hotspotAria}
    >
      <span className="rs-mii-dock__tag">{BRAND_COPY.tagConfigurator}</span>
      <span className="rs-mii-dock__title">{BRAND_COPY.panelTitle}</span>
      <span className="rs-mii-dock__cta">{BRAND_COPY.panelCta}</span>
    </button>
  );
}
