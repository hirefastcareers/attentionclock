import { vemetric } from "@vemetric/web";

const token =
  process.env.NEXT_PUBLIC_VEMETRICS_PROJECT_ID ||
  process.env.NEXT_PUBLIC_VEMETRIC_TOKEN;

if (token) {
  vemetric.init({
    token,
    scriptUrl: "/_v_script.js",
    host: "/_v",
    trackPageViews: true,
    trackOutboundLinks: true,
  });
}
