import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/_v_script.js",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/_v/:slug*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/_v_script.js",
        destination: "https://cdn.vemetric.com/main.js",
      },
    ];
  },
};

export default nextConfig;
