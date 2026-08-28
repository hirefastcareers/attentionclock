import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { createAdminSupabase } from "@/lib/supabase";

const AD_DURATION_SECONDS = 60;

type PaymentSucceededEvent = {
  type: string;
  data?: {
    payment_id?: string;
    metadata?: {
      title?: string;
      url?: string;
      banner_color?: string;
    };
  };
};

export async function POST(req: Request) {
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const webhookId = req.headers.get("webhook-id") ?? "";
  const webhookTimestamp = req.headers.get("webhook-timestamp") ?? "";
  const webhookSignature = req.headers.get("webhook-signature") ?? "";

  try {
    new Webhook(webhookKey).verify(rawBody, {
      "webhook-id": webhookId,
      "webhook-timestamp": webhookTimestamp,
      "webhook-signature": webhookSignature,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as PaymentSucceededEvent;

  if (body.type === "payment.succeeded") {
    const { title, url, banner_color } = body.data?.metadata ?? {};
    const paymentId = body.data?.payment_id;

    if (
      typeof title !== "string" ||
      typeof url !== "string" ||
      typeof banner_color !== "string"
    ) {
      return NextResponse.json({ received: true });
    }

    const supabase = createAdminSupabase();

    const { data: latestAd } = await supabase
      .from("ads")
      .select("ends_at")
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();
    let startsAt = now;

    if (latestAd && new Date(latestAd.ends_at) > now) {
      startsAt = new Date(latestAd.ends_at);
    }

    const endsAt = new Date(startsAt.getTime() + AD_DURATION_SECONDS * 1000);

    const { error } = await supabase.from("ads").insert({
      title,
      url,
      banner_color,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: startsAt <= now ? "active" : "pending",
      payment_id: paymentId ?? null,
    });

    // 23505 = unique_violation (duplicate webhook delivery)
    if (error && error.code !== "23505") {
      return NextResponse.json(
        { error: "Failed to enqueue ad" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
