export function trackVemetrics(
  event: string,
  props?: Record<string, unknown>,
) {
  if (typeof window !== "undefined" && window.vemetrics) {
    window.vemetrics.track(event, props);
  }
}
