import { vemetric } from "@vemetric/web";
import { VEMETRIC_TOKEN } from "@/lib/vemetric-config";

export function trackVemetrics(
  event: string,
  props?: Record<string, unknown>,
) {
  if (typeof window === "undefined" || !VEMETRIC_TOKEN) return;

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
