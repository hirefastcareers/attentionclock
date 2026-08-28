import { NextResponse } from "next/server";

function dodoApiBase() {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const productId = process.env.NEXT_PUBLIC_DODO_PRODUCT_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!apiKey || !productId || !siteUrl) {
      return NextResponse.json(
        { error: "Checkout is not configured" },
        { status: 500 },
      );
    }

    const { title, url, banner_color } = await req.json();

    if (
      typeof title !== "string" ||
      typeof url !== "string" ||
      typeof banner_color !== "string"
    ) {
      return NextResponse.json(
        { error: "title, url, and banner_color are required" },
        { status: 400 },
      );
    }

    const response = await fetch(`${dodoApiBase()}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Flat fee (e.g. $5) for 60 seconds
        product_cart: [{ product_id: productId, quantity: 1 }],
        metadata: { title, url, banner_color },
        return_url: `${siteUrl}/?success=true`,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.checkout_url) {
      return NextResponse.json(
        { error: "Checkout failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: data.checkout_url });
  } catch {
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
