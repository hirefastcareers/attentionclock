import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const VEMETRICS_PROJECT_ID = process.env.NEXT_PUBLIC_VEMETRICS_PROJECT_ID;

export const metadata: Metadata = {
  title: "SCREENJACK",
  description: "Hijack the entire screen. Stack more time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {VEMETRICS_PROJECT_ID ? (
          <>
            <Script id="vemetrics-api" strategy="beforeInteractive">
              {`
                window.vemetrics = window.vemetrics || {
                  track: function (event, props) {
                    if (typeof window.vmtrc === "function") {
                      window.vmtrc("trackEvent", event, { eventData: props || {} });
                      return;
                    }
                    (window.__vemetricsQueue = window.__vemetricsQueue || []).push([event, props]);
                  }
                };
              `}
            </Script>
            <Script
              id="vemetrics"
              src="https://cdn.vemetric.com/main.js"
              strategy="afterInteractive"
              data-token={VEMETRICS_PROJECT_ID}
            />
            <Script id="vemetrics-flush" strategy="afterInteractive">
              {`
                (function wait(attempt) {
                  var ready = typeof window.vmtrc === "function";
                  if (!ready && attempt < 40) {
                    setTimeout(function () { wait(attempt + 1); }, 50);
                    return;
                  }
                  var queue = window.__vemetricsQueue || [];
                  window.__vemetricsQueue = [];
                  window.vemetrics = {
                    track: function (event, props) {
                      if (typeof window.vmtrc === "function") {
                        window.vmtrc("trackEvent", event, { eventData: props || {} });
                      }
                    }
                  };
                  queue.forEach(function (item) {
                    window.vemetrics.track(item[0], item[1]);
                  });
                })(0);
              `}
            </Script>
          </>
        ) : null}
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
