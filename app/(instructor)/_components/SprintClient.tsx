"use client";

import { useState, useTransition } from "react";
import {
  createMilestone,
  toggleMilestoneArchive,
  pushMilestoneToStudents,
} from "@/lib/actions/instructor";
import type { MilestoneData } from "@/lib/actions/instructor";

interface Props {
  courseId: string;
  initialMilestones: MilestoneData[];
  totalStudents: number;
}

export function SprintClient({ courseId, initialMilestones, totalStudents }: Props) {
  const [milestones, setMilestones] = useState<MilestoneData[]>(initialMilestones);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mDue, setMDue] = useState("");
  const [mModule, setMModule] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleCreate() {
    if (!mTitle.trim()) { showToast("Add a title first"); return; }
    startTransition(async () => {
      const res = await createMilestone(courseId, {
        title: mTitle,
        description: mDesc,
        dueDate: mDue,
        moduleTag: mModule,
      });
      if (!res.success) { showToast("Failed to create — try again"); return; }

      const due = mDue
        ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
            new Date(mDue + "T12:00:00Z")
          )
        : "TBD";

      const newM: MilestoneData = {
        id: res.id!,
        title: mTitle,
        description: mDesc,
        due,
        moduleTag: mModule || "Unscheduled",
        isArchived: false,
        todoCount: 0,
        inProgressCount: 0,
        doneCount: 0,
        totalStudents,
      };
      setMilestones((ms) => [newM, ...ms]);
      setMTitle("");
      setMDesc("");
      setMDue("");
      setMModule("");
      setShowAdd(false);
      showToast(`"${newM.title}" created`);
    });
  }

  function handleToggleArchive(id: string) {
    startTransition(async () => {
      const res = await toggleMilestoneArchive(courseId, id);
      if (!res.success) { showToast("Failed — try again"); return; }
      setMilestones((ms) =>
        ms.map((m) => (m.id === id ? { ...m, isArchived: res.isArchived! } : m))
      );
      showToast(res.isArchived ? "Milestone archived" : "Milestone unarchived");
    });
  }

  function handlePush(id: string, title: string) {
    startTransition(async () => {
      const res = await pushMilestoneToStudents(courseId, id);
      if (!res.success) { showToast("Failed to push — try again"); return; }
      showToast(
        res.count === 0
          ? `All students already have "${title}"`
          : `Pushed "${title}" to ${res.count} student${res.count !== 1 ? "s" : ""}`
      );
    });
  }

  function donePct(m: MilestoneData): number {
    const total = m.todoCount + m.inProgressCount + m.doneCount;
    if (total === 0) return 0;
    return Math.round((m.doneCount / total) * 100);
  }

  return (
    <div className="flex flex-col gap-[18px]" style={{ animation: "csFade .25s ease" }}>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif font-normal text-[1.7rem] text-text-primary">
            Sprint milestones
          </h2>
          <p className="text-sm text-text-muted">
            Milestones you publish appear on every student&apos;s sprint board.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-gold text-bg border-none rounded-[9px] px-[18px] py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-105 transition-all flex items-center gap-1.5"
        >
          + Add milestone
        </button>
      </div>

      {/* Add milestone form */}
      {showAdd && (
        <div
          className="border rounded-[15px] px-[22px] py-5 flex flex-col gap-3.5"
          style={{
            background: "#141417",
            borderColor: "color-mix(in srgb, #F5C842 25%, transparent)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-serif text-[18px] text-text-primary">
              New milestone
            </span>
            <button
              onClick={() => setShowAdd(false)}
              className="bg-transparent border-none text-text-muted text-[18px] cursor-pointer leading-none hover:text-text-primary"
            >
              ×
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
              TITLE
            </label>
            <input
              value={mTitle}
              onChange={(e) => setMTitle(e.target.value)}
              placeholder="Project 4 · Graph Pathfinder"
              className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-sans text-[14px] outline-none placeholder:text-[#5f5d57]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
              DESCRIPTION
            </label>
            <textarea
              value={mDesc}
              onChange={(e) => setMDesc(e.target.value)}
              placeholder="What students should build and the acceptance criteria…"
              className="min-h-[74px] resize-y bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-sans text-[14px] leading-[1.6] outline-none placeholder:text-[#5f5d57]"
            />
          </div>
          <div className="flex gap-3.5 flex-wrap">
            <div className="flex-1 min-w-[160px] flex flex-col gap-2">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                DUE DATE
              </label>
              <input
                type="date"
                value={mDue}
                onChange={(e) => setMDue(e.target.value)}
                className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[10px] font-mono text-[13px] outline-none [color-scheme:dark]"
              />
            </div>
            <div className="flex-1 min-w-[160px] flex flex-col gap-2">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                MODULE TAG
              </label>
              <input
                value={mModule}
                onChange={(e) => setMModule(e.target.value)}
                placeholder="Week 12"
                className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-mono text-[13px] outline-none placeholder:text-[#5f5d57]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              onClick={() => setShowAdd(false)}
              className="bg-transparent text-[#D7D5CE] border border-white/[0.14] rounded-[9px] px-4 py-[9px] font-sans text-[13px] font-semibold cursor-pointer hover:border-white/25"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="bg-gold text-bg border-none rounded-[9px] px-[18px] py-[9px] font-sans text-[13px] font-semibold cursor-pointer hover:brightness-105 disabled:opacity-60"
            >
              {isPending ? "Creating…" : "Create & publish"}
            </button>
          </div>
        </div>
      )}

      {/* Milestones list */}
      {milestones.length === 0 ? (
        <div className="text-center py-14 text-text-faint font-mono text-[12px]">
          No milestones yet. Create one to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {milestones.map((m) => {
            const isOpen = expanded.has(m.id);
            const pct = donePct(m);
            return (
              <div
                key={m.id}
                className="bg-surface border border-white/[0.07] rounded-[14px] overflow-hidden"
              >
                {/* Accordion header */}
                <div
                  onClick={() => toggleExpand(m.id)}
                  className="flex items-center gap-3.5 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-text-faint font-mono text-[13px] w-3.5 flex-none">
                    {isOpen ? "▾" : "▸"}
                  </span>
                  <div className="flex flex-col gap-[3px] min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-serif text-[18px] text-text-primary">
                        {m.title}
                      </span>
                      <span
                        className={[
                          "font-mono text-[10.5px] tracking-[.06em] px-2 py-0.5 rounded-[5px]",
                          m.isArchived
                            ? "text-text-faint bg-white/[0.06]"
                            : "text-gold bg-gold/10",
                        ].join(" ")}
                      >
                        {m.isArchived ? "archived" : "active"}
                      </span>
                    </div>
                    <span className="font-mono text-[11.5px] text-text-muted">
                      {m.moduleTag} · due {m.due}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-none">
                    <span className="font-mono text-[12px] text-[#A7A59E]">
                      {pct}% done
                    </span>
                    <div className="w-[120px] h-[6px] rounded-full overflow-hidden bg-white/[0.08]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: pct === 100 ? "#F5C842" : "color-mix(in srgb, #F5C842 60%, #1c1c21)",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="px-5 pb-[18px] pt-4 flex flex-col gap-3.5 border-t border-white/[0.05] pl-12">
                    <p className="text-[14px] text-[#C2C0B9] leading-[1.65]">
                      {m.description || "No description."}
                    </p>
                    <div className="flex gap-6 flex-wrap">
                      {[
                        { value: m.todoCount, label: "NOT STARTED", color: "#8C8A83" },
                        { value: m.inProgressCount, label: "IN PROGRESS", color: "#D7D5CE" },
                        { value: m.doneCount, label: `DONE · of ${m.todoCount + m.inProgressCount + m.doneCount}`, color: "#F5C842" },
                      ].map((s) => (
                        <div key={s.label} className="flex flex-col gap-0.5">
                          <span className="font-mono text-[22px]" style={{ color: s.color }}>
                            {s.value}
                          </span>
                          <span className="font-mono text-[10.5px] tracking-[.08em] text-text-faint">
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2.5 flex-wrap">
                      <button
                        onClick={() => handlePush(m.id, m.title)}
                        disabled={isPending}
                        className="bg-transparent text-gold border border-gold/38 rounded-[8px] px-[15px] py-2 font-sans text-[12.5px] font-semibold cursor-pointer hover:bg-gold/10 disabled:opacity-50"
                      >
                        Push to all {totalStudents} student{totalStudents !== 1 ? "s" : ""}
                      </button>
                      <button
                        onClick={() => handleToggleArchive(m.id)}
                        disabled={isPending}
                        className="bg-transparent text-text-muted border border-white/10 rounded-[8px] px-[15px] py-2 font-sans text-[12.5px] font-semibold cursor-pointer hover:border-white/20 disabled:opacity-50"
                      >
                        {m.isArchived ? "Unarchive" : "Archive"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
