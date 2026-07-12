"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCourse } from "@/lib/actions/courses";
import { BookOpen, Plus, ChevronRight } from "lucide-react";

const LANGUAGES = ["Python", "JavaScript", "TypeScript", "Java", "C", "Go", "Rust"];
const TIMEZONES = [
  "Asia/Manila",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
];

interface Course {
  id: string;
  name: string;
  description: string;
  languageTag: string;
  isArchived: boolean;
  inviteCode: string;
}

interface Props {
  initialCourses: Course[];
}

export function CoursesHomeClient({ initialCourses }: Props) {
  const router = useRouter();
  const [courses] = useState(initialCourses);
  const [showForm, setShowForm] = useState(courses.length === 0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("Python");
  const [timezone, setTimezone] = useState("America/New_York");
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function handleCreate() {
    if (!name.trim()) { showToast("Course name is required"); return; }
    startTransition(async () => {
      const res = await createCourse({
        name,
        description,
        languageTag: language,
        timezone,
        streakRules: { challenge: true, checkin: true, sprintCard: true },
      });
      if (!res.success) { showToast("Failed to create course — try again"); return; }
      router.push(`/dashboard/instructor/${res.courseId}`);
    });
  }

  return (
    <div className="w-full flex flex-col gap-8" style={{ animation: "csFade .25s ease" }}>
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif font-normal text-[2.2rem] text-text-primary tracking-[-0.01em]">
          {courses.length === 0 ? "Create your first course" : "Your courses"}
        </h1>
        <p className="text-sm text-text-muted">
          {courses.length === 0
            ? "Set up a course to start tracking your students' streaks."
            : "Select a course to manage, or create a new one."}
        </p>
      </div>

      {/* Existing courses */}
      {courses.length > 0 && (
        <div className="flex flex-col gap-3">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/dashboard/instructor/${c.id}`)}
              className="w-full text-left bg-surface border border-white/[0.07] rounded-[15px] px-5 py-4 flex items-center justify-between gap-4 hover:border-white/15 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                  <BookOpen size={17} className="text-gold" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-sans text-[15px] font-semibold text-[#E4E2DB] truncate">
                      {c.name}
                    </span>
                    {c.isArchived && (
                      <span className="font-mono text-[10px] text-text-faint border border-white/10 rounded px-1.5 py-px shrink-0">
                        archived
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-text-muted">
                      {c.languageTag}
                    </span>
                    <span className="font-mono text-[11px] text-text-faint">
                      {c.inviteCode}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-faint shrink-0" />
            </button>
          ))}

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-white/15 rounded-[15px] px-5 py-4 text-text-muted hover:text-text-secondary hover:border-white/25 transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span className="font-sans text-[13.5px]">New course</span>
            </button>
          )}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-surface border border-white/[0.07] rounded-[16px] px-6 py-6 flex flex-col gap-5">
          <span className="font-mono text-[11px] tracking-[.12em] text-text-muted">
            NEW COURSE
          </span>

          <div className="flex flex-col gap-2">
            <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
              NAME
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CS 101 — Fall 2026"
              autoFocus
              className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-sans text-[14px] outline-none placeholder:text-[#5f5d57]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
              DESCRIPTION
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the course (optional)"
              className="min-h-[72px] resize-y bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-sans text-[14px] leading-[1.6] outline-none placeholder:text-[#5f5d57]"
            />
          </div>

          <div className="flex gap-3.5 flex-wrap">
            <div className="flex-1 min-w-[160px] flex flex-col gap-2">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                LANGUAGE
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-mono text-[13px] outline-none cursor-pointer [color-scheme:dark]"
              >
                {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[200px] flex flex-col gap-2">
              <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
                TIMEZONE · STREAK RESET
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-mono text-[13px] outline-none cursor-pointer [color-scheme:dark]"
              >
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            {courses.length > 0 && (
              <button
                onClick={() => setShowForm(false)}
                className="font-sans text-[13px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer bg-transparent border-none"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="ml-auto bg-gold text-bg border-none rounded-[9px] px-6 py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-105 transition-all disabled:opacity-60"
            >
              {isPending ? "Creating…" : "Create course"}
            </button>
          </div>
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
