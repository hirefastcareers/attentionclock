import { vemetric } from "@vemetric/web";

export function trackVemetrics(
  event: string,
  props?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;

  const token =
    process.env.NEXT_PUBLIC_VEMETRICS_PROJECT_ID ||
    process.env.NEXT_PUBLIC_VEMETRIC_TOKEN;
  if (!token) return;

  try {
    const tracked = vemetric.trackEvent(
      event,
      props ? { eventData: props } : undefined,
    );
    void Promise.resolve(tracked).catch(() => undefined);
  } catch {
    // Tracking must never break checkout or playback.
  }
}
