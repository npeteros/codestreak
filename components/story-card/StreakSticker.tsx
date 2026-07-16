"use client";

import * as React from "react";
import { Logomark } from "@/components/brand/Logomark";
import { HEAT_COLORS } from "@/components/student/StreakHeader";
import { chunkIntoWeeks } from "@/lib/domain/streak";
import type { StreakEntry } from "@/lib/actions/streak";

export interface StreakStickerProps {
  streak: number;
  longest: number;
  activeDays: number;
  /** Chronological ascending, e.g. straight from StreakData.entries — only the most recent WEEKS*7 days are shown. */
  entries: StreakEntry[];
  className?: string;
}

const WIDTH = 760;
const HEIGHT = 340;
const WEEKS = 9;
const CELL = 20;
const GAP = 5;

/**
 * A compact "sticker" version of the dashboard's <StreakHeader> — same stats,
 * same heatmap coloring (HEAT_COLORS), same non-calendar-aligned week chunking
 * — sized and styled to be applied as an overlay sticker on an Instagram Story
 * (as opposed to <StoryCard>, which is a full-bleed 1080×1920 background).
 * Sized to hug its two content blocks — no ml-auto stretch — so there's no
 * dead space between them regardless of streak digit count.
 *
 * Always mount inside <OffscreenStage width={760} height={340}> so the export
 * is pixel-perfect regardless of viewport (see story-card-stage.tsx).
 */
export const StreakSticker = React.forwardRef<HTMLDivElement, StreakStickerProps>(function StreakSticker(
  { streak, longest, activeDays, entries, className },
  ref
) {
  const weeks = chunkIntoWeeks(entries.slice(-WEEKS * 7), WEEKS);

  return (
    <div
      ref={ref}
      data-streak-sticker
      className={`relative flex items-center justify-center gap-9 overflow-hidden${className ? ` ${className}` : ""}`}
      style={{
        width: WIDTH,
        height: HEIGHT,
        background: "#141417",
        color: "#F3F1EA",
        fontFamily: "var(--font-dm-sans), sans-serif",
        borderRadius: 40,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.55)",
        padding: "0 44px",
      }}
    >
      {/* ambient glow — same treatment as StoryCard, CSS only */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 700px 500px at 12% 50%, rgba(245,200,66,0.10), transparent 65%)" }}
      />

      {/* Left: brand + streak stats */}
      <div className="relative z-10 flex flex-col gap-4 flex-none">
        <div className="flex items-center gap-2">
          <Logomark className="h-6 w-6 flex-none" />
          <span style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 18, letterSpacing: "-0.01em", color: "#B7B5AE" }}>
            CodeStreak
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              fontSize: 128,
              fontWeight: 500,
              lineHeight: 0.86,
              color: "#F5C842",
              letterSpacing: "-0.02em",
              textShadow: "0 0 60px rgba(245,200,66,0.35)",
            }}
          >
            {streak}
          </span>
          <span
            className="uppercase"
            style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 20, letterSpacing: "0.1em", color: "#B7B5AE", lineHeight: 1.25 }}
          >
            day
            <br />
            streak
          </span>
        </div>
        <div style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 16, letterSpacing: "0.04em", color: "#8C8A83" }}>
          BEST {longest}&nbsp;&nbsp;·&nbsp;&nbsp;{activeDays} ACTIVE DAYS
        </div>
      </div>

      {/* Right: compact heatmap */}
      <div className="relative z-10 flex flex-col gap-3 min-w-0 flex-none">
        <span
          className="uppercase"
          style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 14, letterSpacing: "0.08em", color: "#8C8A83" }}
        >
          Last {WEEKS} Weeks
        </span>
        <div className="flex" style={{ gap: GAP }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  style={{ width: CELL, height: CELL, borderRadius: 5, background: HEAT_COLORS[day.level] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
