"use client";

import * as React from "react";
import { Logomark } from "@/components/brand/Logomark";

/** One day of activity for the heatmap. `level` is 0–1 intensity (or 0–4 GitHub-style; auto-normalized). */
export interface HeatmapDay {
  date: string; // ISO date, oldest → newest
  level: number;
}

export interface StoryCardProps {
  streakDays: number;
  heatmapData: HeatmapDay[]; // last ~90 days, oldest first
  problemsSolved: number;
  username?: string;
  /** Inline SVG markup (string) for a QR code — generate server-side (e.g. with `qrcode`) and pass as a string.
   *  Never pass a remote image URL here: export must not depend on a network fetch. */
  qrCodeSvg?: string;
  isPersonalBest?: boolean;
  className?: string;
}

const WIDTH = 1080;
const HEIGHT = 1920;
const ROWS = 7;

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function normalizeHeatmap(data: HeatmapDay[]) {
  const days = data.slice(-91);
  const maxLevel = Math.max(1, ...days.map((d) => d.level));
  const norm = maxLevel > 1 ? maxLevel : 1; // supports both 0–1 floats and 0–4 ints
  const cols = Math.max(1, Math.ceil(days.length / ROWS));
  const cellSize = cols > 11 ? 40 : 48;
  return {
    cells: days.map((d) => ({ date: d.date, pct: Math.round(20 + clamp01(d.level / norm) * 60) })),
    weeks: cols,
    cellSize,
  };
}

/**
 * CodeStreak Instagram Story share card. Renders at a fixed 1080×1920 regardless of
 * the viewport it's mounted in — always mount it inside <StoryCardStage> (see
 * story-card-stage.tsx) so the export is pixel-perfect no matter the screen size.
 *
 * No network image assets: the QR code is inline SVG (caller-supplied string) and all
 * other art is CSS gradients / DOM shapes, so `exportStoryCardAsPng` never waits on a
 * remote fetch. Fonts (DM Serif Display, DM Mono, DM Sans) are loaded via
 * `next/font/google` in the root layout, so they're embedded at build time.
 */
export const StoryCard = React.forwardRef<HTMLDivElement, StoryCardProps>(function StoryCard(
  { streakDays, heatmapData, problemsSolved, username, qrCodeSvg, isPersonalBest, className },
  ref
) {
  const heatmap = normalizeHeatmap(heatmapData);

  return (
    <div
      ref={ref}
      data-story-card
      className={`relative overflow-hidden${className ? ` ${className}` : ""}`}
      style={{ width: WIDTH, height: HEIGHT, background: "#0B0B0D", color: "#F3F1EA", fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      {/* ambient glow — CSS only, no image assets */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 900px 700px at 50% 42%, rgba(245,200,66,0.16), transparent 60%), radial-gradient(ellipse 1200px 900px at 50% 100%, rgba(245,200,66,0.05), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full"
        style={{ top: 600, left: "50%", transform: "translateX(-50%)", width: 820, height: 820, background: "#F5C842", opacity: 0.14, filter: "blur(160px)" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 1400px 1400px at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)" }}
      />

      {/* content — kept clear of top/bottom 250px so IG's UI never overlaps it */}
      <div className="absolute left-0 right-0 z-10 flex flex-col items-center justify-center gap-11" style={{ top: 250, height: HEIGHT - 500 }}>
        <div className="flex items-center gap-3">
          <Logomark className="h-[38px] w-[38px] flex-none" />
          <span style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 32, letterSpacing: "-0.01em" }}>CodeStreak</span>
        </div>

        {/* hero streak number — instant-read, largest element on the card */}
        <div className="flex flex-col items-center">
          <span
            className="uppercase"
            style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 22, fontWeight: 500, letterSpacing: "0.32em", color: "rgba(245,200,66,0.85)" }}
          >
            Current Streak
          </span>
          <span
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              fontSize: 440,
              fontWeight: 500,
              lineHeight: 0.86,
              color: "#F5C842",
              letterSpacing: "-0.03em",
              textShadow: "0 0 90px rgba(245,200,66,0.45)",
              marginTop: 6,
            }}
          >
            {streakDays}
          </span>
          <span style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 60, letterSpacing: "-0.01em", marginTop: -6 }}>Day Streak</span>
        </div>

        {isPersonalBest ? (
          <span
            className="rounded-full"
            style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 17, letterSpacing: "0.14em", color: "#F5C842", border: "1px solid rgba(245,200,66,0.4)", padding: "9px 24px" }}
          >
            NEW PERSONAL BEST
          </span>
        ) : null}

        {/* heatmap — framed as a self-contained badge, not a data widget */}
        <div
          className="flex flex-col items-center gap-6 rounded-[32px]"
          style={{ width: 800, padding: "40px 44px 34px", background: "linear-gradient(165deg, rgba(245,200,66,0.09), #141417 55%)", border: "1px solid rgba(245,200,66,0.28)", boxShadow: "0 30px 70px rgba(0,0,0,0.4)" }}
        >
          <span className="uppercase" style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 15, letterSpacing: "0.2em", color: "#8C8A83" }}>
            Last {heatmap.weeks} Weeks
          </span>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${heatmap.weeks}, ${heatmap.cellSize}px)`, gridAutoRows: heatmap.cellSize, gap: 10 }}>
            {heatmap.cells.map((cell, i) => (
              <div key={i} style={{ width: heatmap.cellSize, height: heatmap.cellSize, borderRadius: 10, background: `color-mix(in srgb, #F5C842 ${cell.pct}%, #1a1a1e)` }} />
            ))}
          </div>
          <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 14, letterSpacing: "0.1em", color: "#6b6964" }}>
            {problemsSolved} PROBLEMS SOLVED
          </span>
        </div>

        {(username || qrCodeSvg) && (
          <div className="mt-2 flex items-center gap-6">
            {username ? (
              <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 20, color: "#8C8A83", letterSpacing: "0.05em" }}>{username}</span>
            ) : null}
            {qrCodeSvg ? (
              <div className="flex items-center justify-center rounded-xl" style={{ width: 96, height: 96, background: "#F3F1EA", padding: 8 }} dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
});
