import type { StreakData, StreakEntry } from "@/lib/actions/streak";

const HEAT_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "#1C1C21",
  1: "color-mix(in srgb, #F5C842 30%, #1C1C21)",
  2: "color-mix(in srgb, #F5C842 48%, #1C1C21)",
  3: "color-mix(in srgb, #F5C842 70%, #1C1C21)",
  4: "#F5C842",
};

function Heatmap({ entries, weekCount }: { entries: StreakEntry[]; weekCount: number }) {
  const weeks: StreakEntry[][] = [];
  for (let w = 0; w < weekCount; w++) {
    weeks.push(entries.slice(w * 7, w * 7 + 7));
  }

  return (
    <div className="flex gap-[3px] overflow-x-auto pb-0.5 max-w-full">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day, di) => (
            <div
              key={di}
              title={day.date}
              style={{
                width: 12,
                height: 12,
                borderRadius: 2.5,
                background: HEAT_COLORS[day.level],
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      ))}
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
