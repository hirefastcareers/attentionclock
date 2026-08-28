"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  const liveFg = currentAd ? contrastText(currentAd.banner_color) : "#ffffff";

  return (
    <main
      className="relative h-dvh min-h-screen overflow-hidden text-white transition-colors duration-700"
      style={{
        backgroundColor: currentAd ? currentAd.banner_color : "#050505",
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

      <header className="relative z-40 grid grid-cols-3 items-center gap-2 border-b border-white/10 bg-black/75 px-3 py-3 backdrop-blur-md sm:px-6">
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

      <p className="relative z-30 border-b border-white/10 bg-black/50 px-4 py-2 text-center text-[10px] uppercase tracking-[0.22em] text-white/70 sm:text-xs">
        Hijack the entire screen for 60 seconds.
      </p>

      {paid ? (
        <p className="relative z-30 bg-lime-400/15 px-4 py-1.5 text-center text-[11px] font-semibold tracking-[0.16em] text-lime-300">
          PAYMENT CONFIRMED — YOUR SLOT IS IN THE QUEUE
        </p>
      ) : null}

      {currentAd ? (
        <div
          className="pointer-events-none absolute top-24 right-4 z-30 sm:top-28 sm:right-8"
          style={{ color: liveFg }}
        >
          <p className="text-right text-[10px] font-bold uppercase tracking-[0.3em] opacity-70">
            Airtime left
          </p>
          <p className="timer-blink text-6xl font-black tabular-nums leading-none tracking-tighter sm:text-8xl lg:text-9xl">
            {formatCountdown(timeLeft)}
          </p>
        </div>
      ) : null}

      <section className="relative z-10 flex h-[calc(100dvh-7.5rem)] flex-col items-center justify-center px-4 pb-64 pt-6 sm:pb-72">
        {currentAd ? (
          <h2
            className="max-w-6xl break-words text-center text-6xl font-black leading-[0.9] tracking-tight sm:text-8xl lg:text-9xl"
            style={{ color: liveFg }}
          >
            {currentAd.title}
          </h2>
        ) : (
          <div className="glitch-box max-w-3xl rounded-sm border-2 border-white/80 bg-black/75 px-6 py-10 text-center shadow-[0_0_50px_rgba(255,255,255,0.08)] backdrop-blur-sm">
            <p className="mb-3 text-[10px] font-bold tracking-[0.4em] text-red-400">
              🔴 BROADCAST LIVE
            </p>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              SIGNAL OFFLINE — NO ACTIVE BROADCAST
            </h2>
            <p className="mt-5 text-sm text-white/70 sm:text-base">
              Be the first to take control. Next slot triggers instantly upon
              payment.
            </p>
          </div>
        )}
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 space-y-3 p-4 sm:p-6">
        {currentAd ? (
          <div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-lg border border-white/20 bg-black/70 px-4 py-2.5 text-white backdrop-blur-md">
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
          className="pointer-events-auto mx-auto w-full max-w-md space-y-3 rounded-2xl border border-white/15 bg-black/60 p-5 shadow-[0_12px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              Headline / Pitch
            </span>
            <input
              type="text"
              placeholder="OWN THE INTERNET"
              required
              value={formData.title}
              className="w-full rounded-lg border border-white/15 bg-black/70 p-3 text-white outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/40"
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              Target Link (URL)
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
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              Banner Color
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
                aria-label="Custom banner color"
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
            className="w-full rounded-lg bg-lime-400 py-4 text-sm font-black uppercase tracking-[0.08em] text-black transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {loading ? "Locking slot..." : "HIJACK THE SCREEN NOW ($5)"}
          </button>
        </form>
      </div>
    </main>
  );
}
