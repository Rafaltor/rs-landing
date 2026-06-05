import { NextResponse } from "next/server";
import { createCheckoutUrl } from "@/lib/shopify";

export async function POST(request: Request) {
  const body = (await request.json()) as { variantId?: string };
  const variantId = body.variantId;

  if (!variantId) {
    return NextResponse.json({ error: "variantId required" }, { status: 400 });
  }

  const checkoutUrl = await createCheckoutUrl(variantId);

  if (!checkoutUrl) {
    return NextResponse.json(
      { error: "Unable to create checkout" },
      { status: 502 },
    );
  }

  return NextResponse.json({ checkoutUrl });
}
