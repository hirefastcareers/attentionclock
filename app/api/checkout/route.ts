import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";

const ALLOWED_DURATIONS = new Set([1, 2, 5, 10]);

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  environment:
    process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
      ? "test_mode"
      : "live_mode",
});

function parseDuration(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return ALLOWED_DURATIONS.has(n) ? n : 1;
}

export async function POST(req: Request) {
  try {
    const { title, url, banner_color, duration = 1 } = await req.json();

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

    const durationMinutes = parseDuration(duration);

    const response = await dodo.checkoutSessions.create({
      product_cart: [
        {
          product_id: process.env.NEXT_PUBLIC_DODO_PRODUCT_ID!,
          quantity: durationMinutes,
        },
      ],
      metadata: {
        title,
        url,
        banner_color,
        duration_seconds: String(durationMinutes * 60),
      },
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?success=true`,
    });

    return NextResponse.json({ url: response.checkout_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
