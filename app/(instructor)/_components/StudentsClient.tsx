"use client";

import { useState } from "react";
import { getStudentDetail, nudgeStudent } from "@/lib/actions/instructor";
import type { StudentRow, StudentDetail } from "@/lib/actions/instructor";

type SortKey = "name" | "streak" | "lastDays" | "challenges" | "checkins";
type SortDir = "asc" | "desc";

function heatColor(level: number): string {
  if (level <= 0) return "#1c1c21";
  if (level >= 4) return "#F5C842";
  const pcts = [30, 48, 70];
  return `color-mix(in srgb, #F5C842 ${pcts[level - 1]}%, #1c1c21)`;
}

function MiniHeat({ grid }: { grid: number[][] }) {
  return (
    <div className="flex gap-[2px] overflow-x-auto">
      {grid.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[2px]">
          {week.map((level, di) => (
            <div
              key={di}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
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

function lastText(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days >= 999) return "Never";
  return `${days}d ago`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const TRIGGER_LABEL: Record<string, string> = {
  CHALLENGE: "Challenge",
  CHECKIN: "Check-in",
  SPRINT_CARD: "Sprint Card",
};

interface DrawerProps {
  student: StudentDetail;
  onClose: () => void;
  onNudge: (id: string, name: string) => void;
  nudging: string | null;
}

function StudentDrawer({ student, onClose, onNudge, nudging }: DrawerProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      style={{ background: "rgba(8,8,10,0.62)" }}
      onClick={onClose}
    >
      <div
        className="w-[430px] max-w-[92vw] h-full bg-code-bg border-l border-white/[0.08] overflow-y-auto px-[26px] pt-[26px] pb-10 flex flex-col gap-[22px]"
        style={{ animation: "csDrawer .22s ease" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <span
              className="font-mono text-[11.5px] font-medium text-[#D7D5CE] flex-none flex items-center justify-center rounded-[12px]"
              style={{
                width: 40,
                height: 40,
                background: "#1c1c21",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {student.initials}
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-serif text-[21px] text-text-primary">
                {student.name}
              </span>
              {student.isAtRisk && (
                <span
                  className="font-mono text-[11px] tracking-[.06em]"
                  style={{ color: "#E0795E" }}
                >
                  inactive {lastText(student.lastDays).toLowerCase()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-text-muted text-[22px] cursor-pointer leading-none hover:text-text-primary transition-colors"
          >
            ×
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-3.5">
          <div className="flex-1 bg-surface border border-white/[0.07] rounded-[13px] px-[17px] py-[15px] flex flex-col gap-1">
            <span className="font-mono text-[34px] leading-none text-gold font-medium">
              {student.streak}
            </span>
            <span className="font-mono text-[10.5px] tracking-[.1em] text-text-muted">
              CURRENT STREAK
            </span>
          </div>
          <div className="flex-1 bg-surface border border-white/[0.07] rounded-[13px] px-[17px] py-[15px] flex flex-col gap-1">
            <span className="font-mono text-[34px] leading-none text-[#D7D5CE] font-medium">
              {student.challenges}
            </span>
            <span className="font-mono text-[10.5px] tracking-[.1em] text-text-muted">
              CHALLENGES
            </span>
          </div>
        </div>

        {/* Streak history heatmap */}
        <div className="flex flex-col gap-2.5">
          <span className="font-mono text-[11px] tracking-[.12em] text-text-muted">
            STREAK HISTORY
          </span>
          <MiniHeat grid={student.heatmap} />
        </div>

        {/* Sprint snapshot */}
        <div className="flex flex-col gap-2.5">
          <span className="font-mono text-[11px] tracking-[.12em] text-text-muted">
            SPRINT BOARD SNAPSHOT
          </span>
          <div className="flex gap-2.5">
            {[
              { label: "TO DO", value: student.sprintSnapshot.todo, color: "#8C8A83" },
              { label: "ACTIVE", value: student.sprintSnapshot.inProgress, color: "#D7D5CE" },
              { label: "DONE", value: student.sprintSnapshot.done, color: "#F5C842" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex-1 bg-surface border border-white/[0.06] rounded-[11px] p-[13px] text-center flex flex-col gap-[3px]"
              >
                <span
                  className="font-mono text-[20px]"
                  style={{ color: s.color }}
                >
                  {s.value}
                </span>
                <span className="font-mono text-[10px] text-text-faint">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent journal */}
        {student.recentJournal.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[11px] tracking-[.12em] text-text-muted">
              RECENT JOURNAL ENTRIES
            </span>
            {student.recentJournal.map((e) => (
              <div
                key={e.id}
                className="bg-surface border border-white/[0.06] rounded-[12px] px-4 py-[14px] flex flex-col gap-[7px]"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <span className="font-mono text-[11px] text-gold">
                    {TRIGGER_LABEL[e.triggerType] ?? e.triggerType}
                  </span>
                  <span className="font-mono text-[11px] text-text-faint">
                    {new Date(e.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="text-[13.5px] text-[#C2C0B9] leading-[1.6] italic">
                  {e.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nudge button */}
        {student.isAtRisk && (
          <button
            onClick={() => onNudge(student.id, student.name)}
            disabled={nudging === student.id}
            className="w-full bg-transparent text-gold border border-gold/35 rounded-[9px] py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            {nudging === student.id ? "Sending reminder…" : "Send nudge"}
          </button>
        )}
      </div>

      <style>{`@keyframes csDrawer { from { transform:translateX(30px); opacity:0; } to { transform:none; opacity:1; } }`}</style>
    </div>
  );
}

type SortIndicator = "↑" | "↓" | "";
function sortIndicator(key: SortKey, sortKey: SortKey, sortDir: SortDir): SortIndicator {
  if (key !== sortKey) return "";
  return sortDir === "asc" ? "↑" : "↓";
}

interface Props {
  courseId: string;
  initialRows: StudentRow[];
}

export function StudentsClient({ courseId, initialRows }: Props) {
  const [rows] = useState<StudentRow[]>(initialRows);
  const [sortKey, setSortKey] = useState<SortKey>("streak");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<StudentDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  async function handleRowClick(row: StudentRow) {
    setLoadingId(row.id);
    const res = await getStudentDetail(courseId, row.id);
    setLoadingId(null);
    if (res.success) setSelected(res.student);
  }

  async function handleNudge(id: string, name: string) {
    setNudging(id);
    await nudgeStudent(courseId, id);
    setNudging(null);
    showToast(`Reminder sent to ${name}`);
  }

  const atRiskCount = rows.filter((r) => r.isAtRisk).length;

  const sorted = [...rows].sort((a, b) => {
    let va: number | string;
    let vb: number | string;
    if (sortKey === "name") { va = a.name; vb = b.name; }
    else if (sortKey === "streak") { va = a.streak; vb = b.streak; }
    else if (sortKey === "lastDays") { va = a.lastDays; vb = b.lastDays; }
    else if (sortKey === "challenges") { va = a.challenges; vb = b.challenges; }
    else { va = a.checkinsThisWeek; vb = b.checkinsThisWeek; }

    if (typeof va === "string") {
      return sortDir === "asc" ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
    }
    return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const thClass =
    "font-mono text-[11px] tracking-[.06em] text-text-muted text-left bg-transparent border-none cursor-pointer hover:text-text-primary transition-colors p-0";

  return (
    <div className="flex flex-col gap-[18px]" style={{ animation: "csFade .25s ease" }}>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif font-normal text-[1.7rem] text-text-primary">
            Students
          </h2>
          <p className="text-sm text-text-muted">
            {rows.length} enrolled · click a row for the full picture.
          </p>
        </div>
        {atRiskCount > 0 && (
          <span
            className="font-mono text-[12px] border rounded-[8px] px-3 py-1.5"
            style={{
              color: "#E0795E",
              borderColor: "color-mix(in srgb, #E0795E 35%, transparent)",
            }}
          >
            {atRiskCount} at-risk
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-14 text-text-faint font-mono text-[12px]">
          No students enrolled yet.
        </div>
      ) : (
        <div className="bg-surface border border-white/[0.07] rounded-[16px] overflow-x-auto">
          <div style={{ minWidth: 720 }}>
            {/* Header */}
            <div className="grid gap-2 px-5 py-3.5 border-b border-white/[0.07]"
              style={{ gridTemplateColumns: "2.2fr 1fr 1.4fr 1.1fr 1.2fr 34px" }}>
              <button className={thClass} onClick={() => handleSort("name")}>
                Student {sortIndicator("name", sortKey, sortDir)}
              </button>
              <button className={thClass} onClick={() => handleSort("streak")}>
                Streak {sortIndicator("streak", sortKey, sortDir)}
              </button>
              <button className={thClass} onClick={() => handleSort("lastDays")}>
                Last active {sortIndicator("lastDays", sortKey, sortDir)}
              </button>
              <button className={thClass} onClick={() => handleSort("challenges")}>
                Challenges {sortIndicator("challenges", sortKey, sortDir)}
              </button>
              <button className={thClass} onClick={() => handleSort("checkins")}>
                Check-ins {sortIndicator("checkins", sortKey, sortDir)}
              </button>
              <span />
            </div>

            {/* Rows */}
            {sorted.map((r) => (
              <div
                key={r.id}
                onClick={() => handleRowClick(r)}
                className="grid gap-2 px-5 py-[11px] border-t border-white/[0.05] cursor-pointer hover:bg-white/[0.025] transition-colors"
                style={{ gridTemplateColumns: "2.2fr 1fr 1.4fr 1.1fr 1.2fr 34px" }}
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
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[14px] text-[#E4E2DB] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {loadingId === r.id ? `${r.name}…` : r.name}
                    </span>
                    {r.isAtRisk && (
                      <span
                        className="font-mono text-[10px] tracking-[.06em] px-1.5 py-0.5 rounded-[4px] flex-none"
                        style={{
                          color: "#E0795E",
                          background: "color-mix(in srgb, #E0795E 12%, transparent)",
                        }}
                      >
                        at risk
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center font-mono text-[14px] text-gold">
                  {r.streak}
                  <span className="text-text-faint text-[11px] ml-0.5">d</span>
                </div>
                <div
                  className="flex items-center font-mono text-[12.5px]"
                  style={{ color: r.isAtRisk ? "#E0795E" : "#8C8A83" }}
                >
                  {lastText(r.lastDays)}
                </div>
                <div className="flex items-center font-mono text-[13.5px] text-[#C2C0B9]">
                  {r.challenges}
                </div>
                <div className="flex items-center font-mono text-[13.5px] text-[#C2C0B9]">
                  {r.checkinsThisWeek}
                  <span className="text-text-faint text-[11px] ml-0.5">/7</span>
                </div>
                <div className="flex items-center justify-center text-text-faint">
                  →
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student drawer */}
      {selected && (
        <StudentDrawer
          student={selected}
          onClose={() => setSelected(null)}
          onNudge={handleNudge}
          nudging={nudging}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-7 left-1/2 z-60 bg-[#1A1A1F] border border-gold/35 rounded-[11px] px-5 py-3 flex items-center gap-2.5 shadow-2xl"
          style={{ transform: "translateX(-50%)", animation: "csToast .2s ease" }}
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
