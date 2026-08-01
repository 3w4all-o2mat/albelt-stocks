"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  /** Interval in milliseconds (default: 300000 = 5 minutes). */
  intervalMs?: number;
  /** Atelier code to watch for count changes (optional). When provided,
   *  a beep will sound if any status count changes between refreshes. */
  atelierCode?: string | null;
}

/**
 * Shared AudioContext, created lazily and reused for all beeps.
 * Kept as a module-level variable so it survives component remounts.
 */
let _audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (!_audioCtx) {
    try {
      _audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  // Attempt to resume – browsers may suspend contexts that
  // weren't created inside a user-gesture handler.
  if (_audioCtx.state === "suspended") {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

/**
 * Plays a short, attention-getting beep using the Web Audio API.
 * Falls back to a console visualisation if audio is unavailable.
 */
function playBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800; // Hz
    osc.type = "sine";
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available – silently ignore.
  }
}

/**
 * Client component that silently re-fetches the current page's server components
 * at the given interval using Next.js `router.refresh()`.
 *
 * When `atelierCode` is provided, it also polls the counts API before each
 * refresh and plays a beep if any of the three status counts has changed
 * compared to the previous poll.
 *
 * Renders nothing — it's a side-effect-only component.
 */
export function AutoRefresh({
  intervalMs = 300_000,
  atelierCode = null,
}: AutoRefreshProps) {
  const router = useRouter();
  // Keep the previous counts across refresh cycles.
  const prevCountsRef = useRef<Record<string, number> | null>(null);

  useEffect(() => {
    // --- Simple refresh (no atelier code) ---
    if (!atelierCode) {
      const id = setInterval(() => router.refresh(), intervalMs);
      return () => clearInterval(id);
    }

    // --- Count‑watching + refresh ---

    // Seed the baseline asynchronously (no router.refresh yet).
    fetch(
      `/api/ateliers/${encodeURIComponent(atelierCode)}/bons/counts`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((counts) => {
        if (counts) prevCountsRef.current = counts;
      })
      .catch(() => {});

    async function pollAndRefresh() {
      try {
        const res = await fetch(
          `/api/ateliers/${encodeURIComponent(atelierCode)}/bons/counts`
        );
        if (!res.ok) return;
        const counts: Record<string, number> = await res.json();

        const prev = prevCountsRef.current;
        if (prev != null) {
          // Compare each status count.
          const changed =
            prev["1"] !== counts["1"] ||
            prev["2"] !== counts["2"] ||
            prev["3"] !== counts["3"];
          if (changed) {
            playBeep();
          }
        }

        // Store for next comparison.
        prevCountsRef.current = counts;
      } catch {
        // Network error – ignore, will retry next interval.
      }

      router.refresh();
    }

    const id = setInterval(pollAndRefresh, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, atelierCode]);

  return null;
}
