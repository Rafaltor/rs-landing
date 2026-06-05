export type ShopifyProduct = {
  title: string;
  description: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  image: {
    url: string;
    altText: string | null;
  } | null;
  variantId: string | null;
};

type ProductQueryResponse = {
  data?: {
    product?: {
      title: string;
      description: string;
      priceRange: {
        minVariantPrice: {
          amount: string;
          currencyCode: string;
        };
      };
      images: {
        edges: Array<{
          node: { url: string; altText: string | null };
        }>;
      };
      variants: {
        edges: Array<{
          node: { id: string };
        }>;
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
};

const PRODUCT_QUERY = `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      title
      description
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 1) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 1) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`;

export async function getProduct(handle: string): Promise<ShopifyProduct | null> {
  const domain = process.env.SHOPIFY_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!domain || !token || !handle) {
    return null;
  }

  const res = await fetch(`https://${domain}/api/2024-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({
      query: PRODUCT_QUERY,
      variables: { handle },
    }),
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[shopify] getProduct HTTP ${res.status} for ${domain} — vérifie SHOPIFY_DOMAIN et SHOPIFY_STOREFRONT_TOKEN`,
      );
    }
    return null;
  }

  const json = (await res.json()) as ProductQueryResponse;

  if (json.errors?.length || !json.data?.product) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[shopify] getProduct:",
        json.errors?.map((e) => e.message).join("; ") ||
          `aucun produit pour le handle "${handle}" (publié sur le canal Storefront ?)`,
      );
    }
    return null;
  }

  const product = json.data.product;
  const imageNode = product.images.edges[0]?.node;
  const variantNode = product.variants.edges[0]?.node;

  return {
    title: product.title,
    description: product.description,
    price: product.priceRange.minVariantPrice,
    image: imageNode
      ? { url: imageNode.url, altText: imageNode.altText }
      : null,
    variantId: variantNode?.id ?? null,
  };
}

const CART_CREATE_MUTATION = `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        checkoutUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function createCheckoutUrl(
  variantId: string,
): Promise<string | null> {
  const domain = process.env.SHOPIFY_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!domain || !token) {
    return null;
  }

  const res = await fetch(`https://${domain}/api/2024-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({
      query: CART_CREATE_MUTATION,
      variables: {
        lines: [{ merchandiseId: variantId, quantity: 1 }],
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  const json = (await res.json()) as {
    data?: {
      cartCreate?: {
        cart?: { checkoutUrl: string };
        userErrors?: Array<{ message: string }>;
      };
    };
  };

  const checkoutUrl = json.data?.cartCreate?.cart?.checkoutUrl;
  const hasErrors = json.data?.cartCreate?.userErrors?.length;

  if (hasErrors || !checkoutUrl) {
    return null;
  }

  return checkoutUrl;
}
