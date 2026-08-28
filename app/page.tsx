"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import type { Ad } from "@/lib/types";

const COLOR_SWATCHES = [
  "#ff0033",
  "#c8ff00",
  "#00f0ff",
  "#7c3aed",
  "#ff6b00",
  "#ffffff",
];

function formatCountdown(seconds: number) {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function contrastText(hex: string) {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return "#ffffff";
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#050505" : "#ffffff";
}

export default function Screenjack() {
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    banner_color: "#ff0033",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewers, setViewers] = useState(1420);
  const [paid, setPaid] = useState(false);
  const lastTrackedId = useRef<string | null>(null);
  const supabaseRef = useRef(createBrowserSupabase());

  const fetchActiveAd = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    const now = new Date().toISOString();
    const { data } = await supabase
      .from("ads")
      .select("*")
      .lte("starts_at", now)
      .gte("ends_at", now)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ad = (data as Ad | null) ?? null;
    setCurrentAd(ad);

    if (ad) {
      setTimeLeft(
        Math.max(
          0,
          Math.floor((new Date(ad.ends_at).getTime() - Date.now()) / 1000),
        ),
      );
    } else {
      setTimeLeft(0);
    }

    if (ad && lastTrackedId.current !== ad.id) {
      lastTrackedId.current = ad.id;
      window.vemetrics?.track("Ad View", { ad_id: ad.id, title: ad.title });
    }

    if (!ad) {
      lastTrackedId.current = null;
    }
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    fetchActiveAd();

    const channel = supabase
      .channel("ads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ads" },
        () => {
          fetchActiveAd();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveAd]);

  useEffect(() => {
    if (!currentAd) return;

    const interval = setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor((new Date(currentAd.ends_at).getTime() - Date.now()) / 1000),
      );
      setTimeLeft(diff);
      if (diff === 0) fetchActiveAd();
    }, 250);

    return () => clearInterval(interval);
  }, [currentAd, fetchActiveAd]);

  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) =>
        Math.max(980, Math.min(2480, v + Math.floor(Math.random() * 21) - 10)),
      );
    }, 1600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") setPaid(true);
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setError(data.error ?? "Checkout failed");
    } catch {
      setError("Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  const tickerItems = useMemo(
    () => [
      `🔥 Next Available Slot: ${currentAd ? formatCountdown(timeLeft) : "INSTANT"}`,
      `👥 Active Viewers: ${viewers.toLocaleString()}`,
      "⏱️ Standard Airtime: 60s",
      "💰 Slot Price: $5.00",
      "📡 Share of Voice: 100%",
    ],
    [currentAd, timeLeft, viewers],
  );

  const previewTitle = formData.title.trim() || "YOUR HEADLINE HERE";
  const previewFg = contrastText(formData.banner_color);
  const liveFg = currentAd ? contrastText(currentAd.banner_color) : "#ffffff";

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-x-hidden text-white"
      style={{
        backgroundColor: currentAd ? currentAd.banner_color : "#020403",
      }}
    >
      <div className="sticky top-0 z-40 overflow-hidden border-b border-lime-400/30 bg-black/90 py-2 backdrop-blur-md">
        <div className="ticker-track flex w-max gap-10 whitespace-nowrap px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-300 sm:text-xs">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex gap-10">
              {tickerItems.map((item, i) => (
                <span key={`${copy}-${i}`}>{item}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <header className="relative z-30 flex flex-col items-center gap-3 px-4 py-5 text-center sm:py-6">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <h1 className="text-4xl font-black tracking-[0.18em] text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.35)] sm:text-6xl">
            SCREENJACK
          </h1>
          <span className="inline-flex items-center gap-2 rounded-full border border-red-500/60 bg-red-600/20 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-red-300 sm:text-xs">
            <span className="rec-dot h-2.5 w-2.5 rounded-full bg-red-500" />
            LIVE BROADCAST
          </span>
        </div>
        <p className="max-w-xl text-xs uppercase tracking-[0.28em] text-white/70 sm:text-sm">
          Buy 100% internet share-of-voice for 60 seconds.
        </p>
        {paid ? (
          <p className="rounded border border-lime-400/40 bg-lime-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-lime-300">
            PAYMENT CONFIRMED — YOUR SLOT IS IN THE QUEUE
          </p>
        ) : null}
      </header>

      <section className="relative z-10 flex min-h-[52vh] flex-1 flex-col">
        {currentAd ? (
          <div
            className="relative flex flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:px-10"
            style={{ color: liveFg }}
          >
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.45em] opacity-70">
              Currently dominating the screen
            </p>
            <a
              href={currentAd.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-8 max-w-5xl break-words text-5xl font-black leading-[0.92] tracking-tight hover:underline sm:text-7xl lg:text-8xl xl:text-9xl"
            >
              {currentAd.title}
            </a>
            <div className="timer-blink text-6xl font-black tabular-nums tracking-tighter sm:text-8xl lg:text-[9rem]">
              {formatCountdown(timeLeft)} remaining
            </div>
          </div>
        ) : (
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(50,255,120,0.12),transparent_58%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(50,255,120,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(50,255,120,0.05)_1px,transparent_1px)] bg-[length:48px_48px]" />
            <div className="radar-sweep pointer-events-none absolute left-1/2 top-1/2 h-[min(120vw,900px)] w-[min(120vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(50,255,140,0.0)_320deg,rgba(50,255,140,0.45)_360deg)] opacity-70" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(70vw,520px)] w-[min(70vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime-400/20" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(48vw,340px)] w-[min(48vw,340px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime-400/15" />
            <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-lime-400/10 to-transparent" />

            <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-8 lg:flex-row lg:items-stretch lg:justify-center">
              <div
                className="glitch-box w-full max-w-xl rounded-sm border-2 border-lime-400/80 bg-black/70 px-6 py-8 text-center shadow-[0_0_40px_rgba(200,255,0,0.15)] backdrop-blur-sm"
                data-text="BROADCAST OFFLINE — NO ACTIVE AD"
              >
                <p className="mb-3 text-[10px] font-bold tracking-[0.4em] text-lime-400/80">
                  STUDIO MONITOR // SIGNAL LOST
                </p>
                <h2 className="text-2xl font-black tracking-tight text-lime-300 sm:text-4xl">
                  BROADCAST OFFLINE — NO ACTIVE AD
                </h2>
                <p className="mt-4 text-xs uppercase tracking-[0.28em] text-white/50">
                  The screen is yours. 60 seconds. $5.
                </p>
              </div>

              <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/55 p-4 shadow-[0_0_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-white/50">
                  Live preview of your hijack
                </p>
                <div
                  className="flex min-h-40 flex-col items-center justify-center rounded-lg px-4 py-6 text-center"
                  style={{
                    backgroundColor: formData.banner_color,
                    color: previewFg,
                  }}
                >
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] opacity-70">
                    Your transmission
                  </p>
                  <p className="mb-4 break-words text-2xl font-black leading-tight">
                    {previewTitle}
                  </p>
                  <p className="timer-blink text-xl font-black tabular-nums">
                    00:60 remaining
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="relative z-30 mx-auto w-full max-w-md px-4 pb-10 pt-2">
        <form
          onSubmit={handleCheckout}
          className="space-y-4 rounded-2xl border border-white/15 bg-black/55 p-6 shadow-[0_0_80px_rgba(200,255,0,0.08)] backdrop-blur-xl"
        >
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-lime-400/80">
              Acquisition terminal
            </p>
            <h2 className="mt-1 text-lg font-black tracking-wide">
              Hijack the broadcast
            </h2>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
              Headline
            </span>
            <input
              type="text"
              placeholder="OWN THE INTERNET"
              required
              value={formData.title}
              className="w-full rounded-lg border border-white/15 bg-black/70 p-3 text-white outline-none ring-lime-400/0 transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/40"
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
              Destination URL
            </span>
            <input
              type="url"
              placeholder="https://yoursite.com"
              required
              value={formData.url}
              className="w-full rounded-lg border border-white/15 bg-black/70 p-3 text-white outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/40"
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
            />
          </label>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
              Broadcast color
            </span>
            <div className="flex items-center gap-2">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use color ${color}`}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    formData.banner_color.toLowerCase() === color
                      ? "scale-110 border-white"
                      : "border-white/20 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() =>
                    setFormData({ ...formData, banner_color: color })
                  }
                />
              ))}
              <input
                type="color"
                value={formData.banner_color}
                aria-label="Custom broadcast color"
                className="h-8 w-12 cursor-pointer rounded border border-white/20 bg-transparent"
                onChange={(e) =>
                  setFormData({ ...formData, banner_color: e.target.value })
                }
              />
            </div>
          </div>

          {error ? (
            <p className="text-center text-sm text-red-400">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-lime-400 py-4 text-sm font-black uppercase tracking-[0.12em] text-black transition hover:bg-yellow-300 disabled:opacity-60 sm:text-base"
          >
            {loading ? "Locking slot..." : "HIJACK THE SCREEN NOW — $5"}
          </button>
        </form>
      </section>
    </main>
  );
}
