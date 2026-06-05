import Image from "next/image";
import { getProduct } from "@/lib/shopify";
import AddToCartButton from "./AddToCartButton";

function formatPrice(amount: string, currencyCode: string): string {
  const value = parseFloat(amount);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}

export default async function ProductCard() {
  const handle = process.env.SHOPIFY_PRODUCT_HANDLE;

  if (!handle) {
    return null;
  }

  const product = await getProduct(handle);

  if (!product) {
    if (process.env.NODE_ENV === "development") {
      return (
        <aside
          className="product-card"
          style={{ borderColor: "rgba(244, 114, 182, 0.5)" }}
        >
          <p className="product-card__title" style={{ fontSize: 12 }}>
            Produit non chargé
          </p>
          <p className="product-card__price" style={{ fontSize: 11 }}>
            Voir le terminal npm run dev. Utilise le jeton public Headless (Storefront),
            pas le jeton Admin d’une app custom.
          </p>
        </aside>
      );
    }
    return null;
  }

  return (
    <aside className="product-card" aria-label="Produit en vedette">
      {product.image && (
        <Image
          src={product.image.url}
          alt={product.image.altText ?? product.title}
          width={248}
          height={248}
          className="product-card__image"
          unoptimized
        />
      )}
      <h2 className="product-card__title">{product.title}</h2>
      <p className="product-card__price">
        {formatPrice(product.price.amount, product.price.currencyCode)}
      </p>
      {product.variantId && (
        <AddToCartButton variantId={product.variantId} />
      )}
    </aside>
  );
}
