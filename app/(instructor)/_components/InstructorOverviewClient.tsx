"use client";

import { useState } from "react";
import { nudgeStudent } from "@/lib/actions/instructor";
import type { OverviewData } from "@/lib/actions/instructor";

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

export function InstructorOverviewClient({ data }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2100);
  }

  async function handleNudge(studentId: string, name: string) {
    setNudging(studentId);
    await nudgeStudent(data.courseId, studentId);
    setNudging(null);
    showToast(`Reminder sent to ${name}`);
  }

  function lastText(days: number): string {
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    return `${days}d ago`;
  }

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

      {/* At-risk students */}
      {data.atRiskStudents.length > 0 && (
        <section className="bg-surface border border-white/[0.07] rounded-[16px] p-[20px_22px] flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span
                className="w-[7px] h-[7px] rounded-[2px] inline-block"
                style={{ background: "#E0795E" }}
              />
              <span
                className="font-mono text-[11px] tracking-[.12em]"
                style={{ color: "#E0795E" }}
              >
                NEEDS ATTENTION
              </span>
            </div>
            <span className="font-mono text-[12px] text-text-muted">
              {data.atRiskStudents.length} inactive 3+ days
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {data.atRiskStudents.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 px-[13px] py-[11px] bg-[#101013] border border-white/[0.06] rounded-[11px]"
              >
                <div className="flex items-center gap-[11px] min-w-0">
                  <span
                    className="font-mono text-[11.5px] font-medium text-[#D7D5CE] flex-none flex items-center justify-center rounded-[9px]"
                    style={{
                      width: 32,
                      height: 32,
                      background: "#1c1c21",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {r.initials}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[13.5px] text-[#E4E2DB] font-medium">
                      {r.name}
                    </span>
                    <span
                      className="font-mono text-[11px]"
                      style={{ color: "#E0795E" }}
                    >
                      inactive {lastText(r.lastDays)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleNudge(r.id, r.name)}
                  disabled={nudging === r.id}
                  className="flex-none font-sans text-[12.5px] font-semibold text-gold border border-gold/35 rounded-[8px] px-[14px] py-[7px] bg-transparent hover:bg-gold/10 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {nudging === r.id ? "Sending…" : "Nudge"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.atRiskStudents.length === 0 && (
        <div className="text-center py-8 text-text-faint font-mono text-[12px]">
          No students need attention right now.
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-7 left-1/2 -translate-x-1/2 z-60 bg-[#1A1A1F] border border-gold/35 rounded-[11px] px-5 py-3 flex items-center gap-2.5 shadow-2xl"
          style={{ animation: "csToast .2s ease" }}
        >
          <span className="w-[18px] h-[18px] rounded-full bg-gold text-bg flex items-center justify-center text-[11px] font-bold flex-none">
            ✓
          </span>
          <span className="text-[13.5px] text-[#ECEAE3]">{toast}</span>
        </div>
      )}

      <style>{`
        @keyframes csFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes csToast { from { transform:translateX(-50%) translateY(10px); opacity:0; } to { transform:translateX(-50%); opacity:1; } }
      `}</style>
    </div>
  );
}
