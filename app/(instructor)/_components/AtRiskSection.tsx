"use client";

import { useState } from "react";
import { nudgeStudent } from "@/lib/actions/instructor";
import type { AtRiskStudent } from "@/lib/actions/instructor";

function lastText(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

interface Props {
  courseId: string;
  students: AtRiskStudent[];
}

export function AtRiskSection({ courseId, students }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2100);
  }

  async function handleNudge(studentId: string, name: string) {
    setNudging(studentId);
    await nudgeStudent(courseId, studentId);
    setNudging(null);
    showToast(`Reminder sent to ${name}`);
  }

  return (
    <>
      {students.length > 0 && (
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
              {students.length} inactive 3+ days
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {students.map((r) => (
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

      {students.length === 0 && (
        <div className="text-center py-8 text-text-faint font-mono text-[12px]">
          No students need attention right now.
        </div>
      )}

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
        @keyframes csToast { from { transform:translateX(-50%) translateY(10px); opacity:0; } to { transform:translateX(-50%); opacity:1; } }
      `}</style>
    </>
  );
}
