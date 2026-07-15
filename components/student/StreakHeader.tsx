"use client";

import { useState } from "react";
import type { StreakData, StreakEntry } from "@/lib/actions/streak";

const HEAT_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "#1C1C21",
  1: "color-mix(in srgb, #F5C842 30%, #1C1C21)",
  2: "color-mix(in srgb, #F5C842 48%, #1C1C21)",
  3: "color-mix(in srgb, #F5C842 70%, #1C1C21)",
  4: "#F5C842",
};

interface TooltipState {
  date: string;
  sources: StreakEntry["sources"];
  x: number;
  y: number;
}

function formatTooltipDate(date: string): string {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatSources(sources: StreakEntry["sources"]): string {
  if (!sources) return "No activity";
  const active: string[] = [];
  if (sources.checkin) active.push("Check-in");
  if (sources.challenge) active.push("Challenge");
  if (sources.sprintCard) active.push("Sprint Card");
  return active.length > 0 ? active.join(", ") : "No activity";
}

// Row index di always maps to the same weekday across every week column,
// since each column is exactly 7 days apart — so it's enough to read the
// weekday off the first column's entries.
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getRowLabels(entries: StreakEntry[]): string[] {
  const labels = new Array(7).fill("");
  for (let di = 0; di < 7 && di < entries.length; di++) {
    const dow = new Date(entries[di].date + "T12:00:00Z").getUTCDay();
    if (dow === 1 || dow === 3 || dow === 5) labels[di] = WEEKDAY_SHORT[dow];
  }
  return labels;
}

function Heatmap({ entries, weekCount }: { entries: StreakEntry[]; weekCount: number }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const weeks: StreakEntry[][] = [];
  for (let w = 0; w < weekCount; w++) {
    weeks.push(entries.slice(w * 7, w * 7 + 7));
  }
  const rowLabels = getRowLabels(entries);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 max-w-full">
      <div className="flex flex-col gap-0.75 shrink-0">
        {rowLabels.map((label, di) => (
          <div
            key={di}
            style={{ height: 12, lineHeight: "12px" }}
            className="font-mono text-[9px] text-text-faint select-none"
          >
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day, di) => (
            <div
              key={di}
              style={{
                width: 12,
                height: 12,
                borderRadius: 2.5,
                background: HEAT_COLORS[day.level],
                flexShrink: 0,
              }}
              onMouseEnter={(e) =>
                setTooltip({ date: day.date, sources: day.sources, x: e.clientX, y: e.clientY })
              }
              onMouseMove={(e) =>
                setTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))
              }
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
        </div>
      ))}

      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y - 16,
            transform: "translate(-50%, -100%)",
            zIndex: 50,
            pointerEvents: "none",
          }}
          className="bg-[#1A1A1A] border border-white/12 rounded-lg px-3 py-2 shadow-xl"
        >
          <p className="font-mono text-[11px] text-text-primary whitespace-nowrap">
            {formatTooltipDate(tooltip.date)}
          </p>
          <p className="font-mono text-[10px] text-text-muted mt-0.5 whitespace-nowrap">
            {formatSources(tooltip.sources)}
          </p>
        </div>
      )}
    </div>
  );
}

export function StreakHeader({ streak, longest, activeDays, weekCount, entries }: StreakData) {
  return (
    <section className="bg-surface border border-white/[0.07] rounded-[18px] px-[26px] py-6 flex flex-wrap gap-[30px] items-center justify-between">
      {/* Left: streak stats */}
      <div className="flex flex-col gap-[10px] min-w-[170px]">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[64px] leading-[0.9] text-gold font-medium tracking-[-0.02em]">
            {streak}
          </span>
          <span className="font-mono text-[13px] tracking-[.1em] uppercase text-text-secondary leading-[1.25]">
            day
            <br />
            streak
          </span>
        </div>
        <div className="font-mono text-[11.5px] tracking-[.04em] text-text-muted">
          BEST {longest}&nbsp;&nbsp;·&nbsp;&nbsp;{activeDays} ACTIVE DAYS
        </div>
      </div>

      {/* Right: heatmap */}
      <div className="flex flex-col gap-[9px] min-w-0">
        <div className="flex justify-between items-center gap-4">
          <span className="font-mono text-[11px] tracking-[.04em] text-text-muted">
            LAST {weekCount} WEEKS
          </span>
          {/* Legend */}
          <div className="flex items-center gap-[5px] font-mono text-[10.5px] text-text-muted">
            <span>Less</span>
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <div
                key={level}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 2.5,
                  background: HEAT_COLORS[level],
                  flexShrink: 0,
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
        <Heatmap entries={entries} weekCount={weekCount} />
      </div>
    </section>
  );
}
