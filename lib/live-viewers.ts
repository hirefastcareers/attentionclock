import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

function parseCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  return null;
}

async function fetchVemetricsViewerCount(): Promise<number | null> {
  if (typeof window === "undefined" || !window.vemetrics) return null;

  const vm = window.vemetrics;

  try {
    if (typeof vm.getActiveUsers === "function") {
      const count = parseCount(await vm.getActiveUsers());
      if (count != null) return count;
    }

    if (typeof vm.presence?.getCount === "function") {
      const count = parseCount(await vm.presence.getCount());
      if (count != null) return count;
    }

    const live = parseCount(vm.liveVisitors);
    if (live != null) return live;
  } catch {
    return null;
  }

  const presenceUrl = process.env.NEXT_PUBLIC_VEMETRICS_PRESENCE_URL;
  if (!presenceUrl) return null;

  try {
    const res = await fetch(presenceUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return parseCount(
      data.count ?? data.visitors ?? data.activeUsers ?? data.users,
    );
  } catch {
    return null;
  }
}

export function useLiveViewers(supabase: SupabaseClient | null) {
  const [viewerCount, setViewerCount] = useState(1);
  const [justJoined, setJustJoined] = useState(false);
  const prevCount = useRef(1);

  useEffect(() => {
    let cancelled = false;
    let pulseTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let presenceChannel: RealtimeChannel | null = null;

    const applyCount = (next: number) => {
      if (cancelled) return;
      const count = Math.max(0, next);
      if (count > prevCount.current) {
        setJustJoined(true);
        clearTimeout(pulseTimer);
        pulseTimer = setTimeout(() => setJustJoined(false), 900);
      }
      prevCount.current = count;
      setViewerCount(Math.max(1, count));
    };

    const startSupabasePresence = () => {
      if (!supabase) {
        applyCount(1);
        return;
      }

      const key =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `viewer-${Math.random().toString(36).slice(2)}`;

      presenceChannel = supabase.channel("online-users", {
        config: { presence: { key } },
      });

      presenceChannel
        .on("presence", { event: "sync" }, () => {
          const state = presenceChannel?.presenceState() ?? {};
          applyCount(Object.keys(state).length);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await presenceChannel?.track({
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    void (async () => {
      const vemetricsCount = await fetchVemetricsViewerCount();
      if (cancelled) return;

      if (vemetricsCount != null) {
        applyCount(vemetricsCount);
        pollTimer = setInterval(async () => {
          const next = await fetchVemetricsViewerCount();
          if (next != null) applyCount(next);
        }, 5000);
        return;
      }

      startSupabasePresence();
    })();

    return () => {
      cancelled = true;
      clearTimeout(pulseTimer);
      clearInterval(pollTimer);
      if (presenceChannel && supabase) {
        void supabase.removeChannel(presenceChannel);
      }
    };
  }, [supabase]);

  return { viewerCount, justJoined };
}
