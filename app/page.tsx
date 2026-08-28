"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { trackVemetrics } from "@/lib/vemetrics";
import type { Ad } from "@/lib/types";

const COLOR_SWATCHES = [
  "#ff0033",
  "#c8ff00",
  "#00f0ff",
  "#7c3aed",
  "#ff6b00",
  "#ffffff",
];

const DURATION_OPTIONS = [
  { minutes: 1, price: 5 },
  { minutes: 2, price: 10 },
  { minutes: 5, price: 25 },
  { minutes: 10, price: 50 },
] as const;

const UNIT_PRICE_USD = 5;

function formatCountdown(seconds: number) {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function parseHex(hex: string) {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return null;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return { r, g, b };
}

function contrastText(hex: string) {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 150 ? "#050505" : "#ffffff";
}

function hexToRgba(hex: string, alpha: number) {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(163, 230, 53, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export default function Screenjack() {
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    banner_color: "#ff0033",
  });
  const [duration, setDuration] = useState<number>(1);
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
      trackVemetrics("Ad View", { ad_id: ad.id, title: ad.title });
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
        body: JSON.stringify({ ...formData, duration }),
      });

      const data = await res.json();
      if (data.url) {
        trackVemetrics("Checkout Initiated", {
          headline: formData.title,
          duration,
        });
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

  const liveFg = currentAd ? contrastText(currentAd.banner_color) : "#ffffff";
  const previewTitle = formData.title.trim();
  const accent = formData.banner_color;

  return (
    <main
      className="relative flex h-dvh min-h-0 flex-col overflow-hidden text-white transition-colors duration-700"
      style={{
        backgroundColor: currentAd ? currentAd.banner_color : "#050505",
        ["--accent" as string]: accent,
      }}
    >
      {!currentAd ? (
        <>
          <div className="tv-noise pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:40px_40px]" />
          <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_2px,rgba(0,0,0,0.28)_3px)] opacity-40" />
        </>
      ) : null}

      <header className="relative z-40 grid shrink-0 grid-cols-3 items-center gap-2 border-b border-white/10 bg-black/75 px-3 py-1.5 backdrop-blur-md sm:px-6 sm:py-2">
        <h1 className="justify-self-start text-lg font-black tracking-[0.18em] sm:text-2xl">
          SCREENJACK
        </h1>
        <div className="justify-self-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-red-500/70 bg-red-600/20 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-red-300 sm:text-xs">
            <span className="rec-dot h-2 w-2 rounded-full bg-red-500" />
            🔴 LIVE BROADCAST
          </span>
        </div>
        <p className="justify-self-end text-[10px] font-bold uppercase tracking-[0.12em] text-white/80 sm:text-sm">
          👥 {viewers.toLocaleString()} watching
        </p>
      </header>

      <p className="relative z-30 shrink-0 border-b border-white/10 bg-black/50 px-4 py-1 text-center text-[10px] uppercase tracking-[0.22em] text-white/70 sm:text-xs">
        Hijack the entire screen. Stack more time.
      </p>

      {paid ? (
        <p className="relative z-30 shrink-0 bg-lime-400/15 px-4 py-1 text-center text-[11px] font-semibold tracking-[0.16em] text-lime-300">
          PAYMENT CONFIRMED — YOUR SLOT IS IN THE QUEUE
        </p>
      ) : null}

      {currentAd ? (
        <div
          className="pointer-events-none absolute top-16 right-4 z-30 sm:top-20 sm:right-8"
          style={{ color: liveFg }}
        >
          <p className="text-right text-[10px] font-bold uppercase tracking-[0.3em] opacity-70">
            Airtime left
          </p>
          <p className="timer-blink text-5xl font-black tabular-nums leading-none tracking-tighter sm:text-7xl lg:text-8xl">
            {formatCountdown(timeLeft)}
          </p>
        </div>
      ) : null}

      <section className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-2 sm:py-3">
        {currentAd ? (
          <h2
            className="max-w-6xl break-words text-center text-5xl font-black leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl"
            style={{ color: liveFg }}
          >
            {currentAd.title}
          </h2>
        ) : (
          <div
            className="preview-card w-full max-w-md rounded-sm border-2 bg-black/75 px-4 py-6 text-center backdrop-blur-sm sm:max-w-2xl sm:px-6 sm:py-8"
            style={{
              borderColor: accent,
              ["--preview-glow" as string]: hexToRgba(accent, 0.5),
            }}
          >
            <p
              className="mb-2 text-[10px] font-bold tracking-[0.4em] sm:mb-3"
              style={{ color: previewTitle ? accent : "#f87171" }}
            >
              {previewTitle ? "LIVE PREVIEW" : "🔴 BROADCAST LIVE"}
            </p>
            <h2
              className="break-words text-2xl font-black tracking-tight sm:text-4xl lg:text-5xl"
              style={{
                color: accent,
                textShadow: `0 0 24px ${hexToRgba(accent, 0.55)}`,
              }}
            >
              {previewTitle || "SIGNAL OFFLINE — NO ACTIVE BROADCAST"}
            </h2>
            <p className="mt-3 text-sm text-white/70 sm:mt-4 sm:text-base">
              {previewTitle
                ? "This is how your hijack will look on air."
                : "Be the first to take control. Next slot triggers instantly upon payment."}
            </p>
          </div>
        )}
      </section>

      <div className="relative z-50 w-full shrink-0 space-y-2 px-4 pb-3 sm:pb-4">
        {currentAd ? (
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-lg border border-white/20 bg-black/70 px-4 py-2 text-white backdrop-blur-md">
            <p className="min-w-0 truncate text-xs opacity-80 sm:text-sm">
              {currentAd.url}
            </p>
            <a
              href={currentAd.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded bg-white px-3 py-1.5 text-[11px] font-black tracking-[0.12em] text-black"
            >
              VISIT SITE
            </a>
          </div>
        ) : null}

        <form
          onSubmit={handleCheckout}
          className="mx-auto w-full max-w-md space-y-2 rounded-2xl border bg-black/60 p-3.5 shadow-[0_12px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-4"
          style={{
            borderColor: hexToRgba(accent, 0.35),
            ["--accent" as string]: accent,
          }}
        >
          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              Headline / Pitch
            </span>
            <input
              type="text"
              placeholder="OWN THE INTERNET"
              required
              value={formData.title}
              className="accent-field w-full rounded-lg border bg-black/70 px-3 py-2 text-white outline-none"
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              Target Link (URL)
            </span>
            <input
              type="url"
              placeholder="https://yoursite.com"
              required
              value={formData.url}
              className="accent-field w-full rounded-lg border bg-black/70 px-3 py-2 text-white outline-none"
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              Duration
            </span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="accent-field w-full rounded-lg border bg-black/70 px-3 py-2 text-white outline-none"
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.minutes} value={option.minutes}>
                  {`${option.minutes} Minute${option.minutes === 1 ? "" : "s"} ($${option.price})`}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              Banner Color
            </span>
            <div className="flex items-center gap-2">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use color ${color}`}
                  className={`h-7 w-7 rounded-full border-2 transition sm:h-8 sm:w-8 ${
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
                aria-label="Custom banner color"
                className="h-7 w-11 cursor-pointer rounded border border-white/20 bg-transparent sm:h-8 sm:w-12"
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
            className="hijack-btn w-full rounded-lg bg-lime-400 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:brightness-110 disabled:opacity-60"
          >
            {loading
              ? "Locking slot..."
              : `HIJACK THE SCREEN NOW ($${duration * UNIT_PRICE_USD})`}
          </button>
        </form>
      </div>
    </main>
  );
}
