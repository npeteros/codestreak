import type { OverviewData } from "@/lib/actions/instructor";
import { AtRiskSection } from "./AtRiskSection";

function heatColor(level: number): string {
  if (level <= 0) return "#1c1c21";
  if (level >= 4) return "#F5C842";
  const pcts = [30, 48, 70];
  return `color-mix(in srgb, #F5C842 ${pcts[level - 1]}%, #1c1c21)`;
}

function HeatGrid({ grid }: { grid: number[][] }) {
  return (
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      {grid.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((level, di) => (
            <div
              key={di}
              style={{
                width: 12,
                height: 12,
                borderRadius: 2.5,
                background: heatColor(level),
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-text-muted">
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            width: 11,
            height: 11,
            borderRadius: 2.5,
            background: heatColor(i),
          }}
        />
      ))}
      <span>More</span>
    </div>
  );
}

interface Props {
  data: OverviewData;
}

export function InstructorOverview({ data }: Props) {
  return (
    <div className="flex flex-col gap-5 animate-[csFade_.25s_ease]">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif font-normal text-[1.7rem] text-text-primary tracking-[-0.01em]">
          Course overview
        </h2>
        <p className="text-sm text-text-muted">
          Where your class stands today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {data.stats.map((s) => (
          <div
            key={s.label}
            className="bg-surface border border-white/[0.07] rounded-[15px] p-[18px_20px] flex flex-col gap-1.5"
          >
            <span className="font-mono text-[10.5px] tracking-[.1em] text-text-muted">
              {s.label}
            </span>
            <span className="font-mono text-[2.5rem] leading-[0.95] font-medium text-gold tracking-[-0.02em]">
              {s.value}
            </span>
            <span className="text-[12.5px] text-text-secondary">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Class activity heatmap */}
      <section className="bg-surface border border-white/[0.07] rounded-[18px] p-[22px_24px] flex flex-col gap-3.5">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-[15px] font-semibold text-[#E4E2DB]">
              Class activity
            </span>
            <span className="font-mono text-[11px] text-text-muted">
              Aggregated streak activity · last {data.weekCount} weeks
            </span>
          </div>
          <Legend />
        </div>
        <HeatGrid grid={data.heatmap} />
      </section>

      <AtRiskSection courseId={data.courseId} students={data.atRiskStudents} />

      <style>{`
        @keyframes csFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
      `}</style>
    </div>
  );
}
