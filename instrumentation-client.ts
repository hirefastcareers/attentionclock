import { vemetric } from "@vemetric/web";

const token = (
  process.env.NEXT_PUBLIC_VEMETRIC_TOKEN ||
  process.env.NEXT_PUBLIC_VEMETRICS_PROJECT_ID
)?.trim();

if (token) {
  try {
    vemetric.init({
      token,
      scriptUrl: "/_v_script.js",
      host: "/_v",
      trackPageViews: true,
      trackOutboundLinks: true,
    });
  } catch {
    // Analytics must never block app startup.
  }
}
