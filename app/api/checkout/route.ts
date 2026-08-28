import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  environment:
    process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
      ? "test_mode"
      : "live_mode",
});

export async function POST(req: Request) {
  try {
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

    const response = await dodo.checkoutSessions.create({
      product_cart: [
        {
          product_id: process.env.NEXT_PUBLIC_DODO_PRODUCT_ID!,
          quantity: 1,
        },
      ],
      metadata: { title, url, banner_color },
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?success=true`,
    });

    return NextResponse.json({ url: response.checkout_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
