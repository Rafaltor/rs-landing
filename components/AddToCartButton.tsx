"use client";

import { useState } from "react";

type AddToCartButtonProps = {
  variantId: string;
};

export default function AddToCartButton({ variantId }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });

      const data = (await res.json()) as { checkoutUrl?: string; error?: string };

      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="product-card__button"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Chargement…" : "Ajouter au panier"}
    </button>
  );
}
