import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import { VEMETRIC_TOKEN } from "@/lib/vemetric-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SCREENJACK",
  description: "Hijack the entire screen. Stack more time.",
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {VEMETRIC_TOKEN ? (
          <>
            <Script id="vemetric-queue" strategy="beforeInteractive">
              {`window.vmtrcq=window.vmtrcq||[];window.vmtrc=window.vmtrc||function(){window.vmtrcq.push(Array.prototype.slice.call(arguments))};`}
            </Script>
            <Script
              id="vmtrc-scr"
              src="/_v_script.js"
              strategy="afterInteractive"
              data-host="/_v"
              data-token={VEMETRIC_TOKEN}
              defer
            />
          </>
        ) : null}
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
