"use client";

import { useState } from "react";
import {
  getHeatmapGrid,
  type HeatmapCell,
  type StreakEntry,
} from "@/lib/streak/calculate";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Mon=0 … Sun=6 labels; only Mon, Wed, Fri are shown
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

interface TooltipState {
  date: string;
  sources: HeatmapCell["sources"];
  x: number;
  y: number;
}

function getCellColor(cell: HeatmapCell | null): string {
  if (!cell || !cell.active || !cell.sources) return "#1A1A1A";
  const hasCheckin = cell.sources.checkin;
  const hasOther = cell.sources.challenge || cell.sources.sprintCard;
  if (hasCheckin && hasOther) return "#F5C842";
  if (hasCheckin) return "#A07820";
  return "#C49A28";
}

function formatTooltipDate(date: string): string {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatSources(sources: HeatmapCell["sources"]): string {
  if (!sources) return "No activity";
  const active: string[] = [];
  if (sources.checkin) active.push("Check-in");
  if (sources.challenge) active.push("Challenge");
  if (sources.sprintCard) active.push("Sprint Card");
  return active.length > 0 ? active.join(", ") : "No activity";
}

// Build week columns from a flat cell array, padded to align Mon–Sun
function buildWeeks(cells: HeatmapCell[]): (HeatmapCell | null)[][] {
  if (cells.length === 0) return [];

  const firstDate = new Date(cells[0].date + "T12:00:00Z");
  // Convert getUTCDay (0=Sun) to Mon-aligned index (0=Mon…6=Sun)
  const startPad = (firstDate.getUTCDay() + 6) % 7;

  const padded: (HeatmapCell | null)[] = [
    ...Array<null>(startPad).fill(null),
    ...cells,
  ];
  while (padded.length % 7 !== 0) padded.push(null);

  const weeks: (HeatmapCell | null)[][] = [];
  for (let w = 0; w < padded.length / 7; w++) {
    weeks.push(padded.slice(w * 7, w * 7 + 7));
  }
  return weeks;
}

function getMonthLabels(weeks: (HeatmapCell | null)[][]): (string | null)[] {
  let lastMonth = -1;
  return weeks.map((week) => {
    const first = week.find((c) => c !== null);
    if (!first) return null;
    const month = new Date(first.date + "T12:00:00Z").getUTCMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      return MONTHS[month];
    }
    return null;
  });
}

interface Props {
  entries: StreakEntry[];
  todayDate: string;
}

export function ActivityHeatmap({ entries, todayDate }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const cells = getHeatmapGrid(entries, todayDate);
  const weeks = buildWeeks(cells);
  const monthLabels = getMonthLabels(weeks);

  const CELL = 12; // px
  const GAP = 3;   // px
  const COL_W = CELL + GAP;

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="inline-flex gap-[3px] min-w-0">

        {/* Day-of-week labels */}
        <div
          className="flex flex-col shrink-0"
          style={{ gap: GAP, paddingTop: 17 + GAP }}
        >
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              style={{ width: 28, height: CELL, lineHeight: `${CELL}px` }}
              className="font-mono text-[9px] text-text-faint select-none"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid: month labels + cell columns */}
        <div className="flex flex-col" style={{ gap: GAP }}>

          {/* Month label row */}
          <div className="flex" style={{ gap: GAP, height: 17 }}>
            {weeks.map((_, wi) => (
              <div
                key={wi}
                style={{ width: CELL, minWidth: CELL }}
                className="font-mono text-[9px] text-text-faint select-none overflow-visible whitespace-nowrap"
              >
                {monthLabels[wi] ?? ""}
              </div>
            ))}
          </div>

          {/* Cell columns */}
          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className="flex flex-col"
                style={{ gap: GAP }}
              >
                {week.map((cell, di) => (
                  <div
                    key={di}
                    style={{
                      width: CELL,
                      height: CELL,
                      minWidth: CELL,
                      borderRadius: 2.5,
                      background: getCellColor(cell),
                      cursor: cell ? "default" : "default",
                    }}
                    onMouseEnter={
                      cell
                        ? (e) =>
                            setTooltip({
                              date: cell.date,
                              sources: cell.sources,
                              x: e.clientX,
                              y: e.clientY,
                            })
                        : undefined
                    }
                    onMouseMove={
                      cell
                        ? (e) =>
                            setTooltip((prev) =>
                              prev ? { ...prev, x: e.clientX, y: e.clientY } : prev
                            )
                        : undefined
                    }
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 52,
            zIndex: 50,
            pointerEvents: "none",
          }}
          className="
            bg-[#1A1A1A] border border-white/[0.12] rounded-lg
            px-3 py-2 shadow-xl
          "
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
