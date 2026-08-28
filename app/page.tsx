"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import type { Ad } from "@/lib/types";

export default function AttentionClock() {
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    banner_color: "#4f46e5",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        Math.floor(
          (new Date(currentAd.ends_at).getTime() - Date.now()) / 1000,
        ),
      );
      setTimeLeft(diff);
      if (diff === 0) fetchActiveAd();
    }, 1000);

    return () => clearInterval(interval);
  }, [currentAd, fetchActiveAd]);

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

  const countdown =
    timeLeft < 10 ? `00:0${timeLeft}` : `00:${timeLeft}`;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black font-mono text-white">
      {currentAd ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-colors duration-500"
          style={{ backgroundColor: currentAd.banner_color || "#111" }}
        >
          <p className="mb-2 text-xl uppercase tracking-widest text-white/70">
            Currently Dominating The Screen
          </p>
          <a
            href={currentAd.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 break-all text-6xl font-extrabold hover:underline"
          >
            {currentAd.title}
          </a>
          <div className="animate-pulse text-8xl font-black tracking-tighter text-yellow-400">
            {countdown}
          </div>
        </div>
      ) : (
        <div className="px-4 pb-64 text-center">
          <h1 className="mb-4 text-5xl font-bold">THE SCREEN IS EMPTY</h1>
          <p className="text-gray-400">
            Claim 60 seconds of 100% internet share of voice.
          </p>
        </div>
      )}

      <div className="absolute bottom-10 z-20 w-full max-w-md px-4">
        <form
          onSubmit={handleCheckout}
          className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/90 p-6 backdrop-blur-md"
        >
          <h2 className="text-center text-lg font-bold">
            Hijack The Screen for $5
          </h2>
          <input
            type="text"
            placeholder="Ad Title / Headline"
            required
            value={formData.title}
            className="w-full rounded border border-gray-700 bg-black p-3 text-white focus:border-yellow-400 focus:outline-none"
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />
          <input
            type="url"
            placeholder="Target URL (https://...)"
            required
            value={formData.url}
            className="w-full rounded border border-gray-700 bg-black p-3 text-white focus:border-yellow-400 focus:outline-none"
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          />
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-400">Background Color:</label>
            <input
              type="color"
              value={formData.banner_color}
              className="h-10 w-full cursor-pointer rounded bg-transparent"
              onChange={(e) =>
                setFormData({ ...formData, banner_color: e.target.value })
              }
            />
          </div>
          {error ? (
            <p className="text-center text-sm text-red-400">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-yellow-400 py-4 text-lg font-black uppercase text-black transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {loading ? "Processing..." : "Take Over Screen (60s)"}
          </button>
        </form>
      </div>
    </main>
  );
}
