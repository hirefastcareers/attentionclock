import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";

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

    const client = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment:
        process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
          ? "test_mode"
          : "live_mode",
    });

    const session = await client.checkoutSessions.create({
      product_cart: [
        {
          product_id: process.env.NEXT_PUBLIC_DODO_PRODUCT_ID as string,
          quantity: 1,
        },
      ],
      metadata: { title, url, banner_color },
      return_url: `${siteUrl}/?success=true`,
    });

    if (!session.checkout_url) {
      return NextResponse.json({ error: "Checkout failed" }, { status: 502 });
    }

    return NextResponse.json({ url: session.checkout_url });
  } catch {
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
