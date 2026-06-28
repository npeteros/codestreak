"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateCourseSettings,
  updateStreakRules,
  toggleCourseArchive,
  deleteCourse,
} from "@/lib/actions/instructor";
import type { CourseSettings } from "@/lib/actions/instructor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const LANGUAGES = ["Python", "JavaScript", "Java", "C", "Go", "Rust", "TypeScript"];
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Manila",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
];
function tzLabel(tz: string): string {
  try {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? "";
    return `${tz} (${offset})`;
  } catch {
    return tz;
  }
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className="relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-none cursor-pointer disabled:opacity-50"
      style={{ background: checked ? "#F5C842" : "rgba(255,255,255,0.12)" }}
    >
      <span
        className="absolute top-[3px] h-4 w-4 rounded-full bg-[#0B0B0D] transition-transform duration-200"
        style={{ left: 3, transform: checked ? "translateX(18px)" : "none" }}
      />
    </button>
  );
}

interface Props {
  settings: CourseSettings;
}

export function SettingsClient({ settings }: Props) {
  const router = useRouter();
  const [name, setName] = useState(settings.name);
  const [description, setDescription] = useState(settings.description);
  const [language, setLanguage] = useState(settings.languageTag);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [rules, setRules] = useState(settings.streakRules);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function handleSaveCourse() {
    startTransition(async () => {
      const res = await updateCourseSettings(settings.courseId, { name, description, languageTag: language, timezone });
      if (res.success) showToast("Course settings saved");
      else showToast("Failed to save — try again");
    });
  }

  function handleToggleRule(key: keyof typeof rules) {
    const next = { ...rules, [key]: !rules[key] };
    setRules(next);
    startTransition(async () => {
      const res = await updateStreakRules(settings.courseId, next);
      if (!res.success) {
        setRules(rules); // revert
        showToast("Failed to update rules");
      }
    });
  }

  function copyCode() {
    navigator.clipboard?.writeText(settings.inviteCode).catch(() => {});
    setCodeCopied(true);
    showToast("Join code copied to clipboard");
    setTimeout(() => setCodeCopied(false), 1500);
  }

  function copyLink() {
    const link = `https://codestreak.app/join/${settings.inviteCode}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setLinkCopied(true);
    showToast("Invite link copied to clipboard");
    setTimeout(() => setLinkCopied(false), 1500);
  }

  function handleArchive() {
    setArchiveDialogOpen(true);
  }

  function handleArchiveConfirm() {
    setArchiveDialogOpen(false);
    const action = settings.isArchived ? "unarchive" : "archive";
    startTransition(async () => {
      const res = await toggleCourseArchive(settings.courseId);
      if (res.success)
        showToast(res.isArchived ? "Course archived — streaks frozen" : "Course unarchived");
      else showToast(`Failed to ${action}`);
    });
  }

  function handleDelete() {
    setDeleteDialogOpen(true);
  }

  function handleDeleteConfirm() {
    setDeleteDialogOpen(false);
    startTransition(async () => {
      const res = await deleteCourse(settings.courseId);
      if (res.success) {
        router.push("/dashboard/instructor");
      } else {
        showToast("Failed to delete course — try again");
      }
    });
  }

  const RULE_ITEMS: Array<{
    key: keyof typeof rules;
    label: string;
    desc: string;
  }> = [
    {
      key: "challenge",
      label: "Daily challenge",
      desc: "Submitting the day's coding challenge counts as an active day.",
    },
    {
      key: "checkin",
      label: "Daily check-in",
      desc: "Completing the daily reflective check-in keeps the streak alive.",
    },
    {
      key: "sprintCard",
      label: "Sprint card",
      desc: "Moving a sprint card to Done counts as an active day.",
    },
  ];

  return (
    <div
      className="flex flex-col gap-[18px]"
      style={{ animation: "csFade .25s ease" }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-serif font-normal text-[1.7rem] text-text-primary">
          Course settings
        </h2>
        <p className="text-sm text-text-muted">
          Course details, enrollment, and how streaks are counted.
        </p>
      </div>

      {/* Course section */}
      <section className="bg-surface border border-white/[0.07] rounded-[15px] px-[22px] py-[22px] flex flex-col gap-4">
        <span className="font-mono text-[11px] tracking-[.12em] text-text-muted">
          COURSE
        </span>
        <div className="flex flex-col gap-2">
          <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
            NAME
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-sans text-[14px] outline-none"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
            DESCRIPTION
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[72px] resize-y bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-sans text-[14px] leading-[1.6] outline-none"
          />
        </div>
        <div className="flex gap-3.5 flex-wrap">
          <div className="flex-1 min-w-[180px] flex flex-col gap-2">
            <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
              LANGUAGE
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-mono text-[13px] outline-none cursor-pointer [color-scheme:dark]"
            >
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[220px] flex flex-col gap-2">
            <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
              TIMEZONE · STREAK RESET
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="bg-code-bg text-text-primary border border-white/10 rounded-[10px] px-[13px] py-[11px] font-mono text-[13px] outline-none cursor-pointer [color-scheme:dark]"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tzLabel(tz)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSaveCourse}
            disabled={isPending}
            className="bg-gold text-bg border-none rounded-[9px] px-5 py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-105 transition-all disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      {/* Invite section */}
      <section className="bg-surface border border-white/[0.07] rounded-[15px] px-[22px] py-[22px] flex flex-col gap-3.5">
        <span className="font-mono text-[11px] tracking-[.12em] text-text-muted">
          INVITE STUDENTS
        </span>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[150px] flex flex-col gap-2">
            <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
              JOIN CODE
            </label>
            <button
              onClick={copyCode}
              className="flex items-center justify-between gap-2.5 bg-code-bg border border-white/10 rounded-[10px] px-[13px] py-[11px] cursor-pointer hover:border-gold/40 transition-colors text-left"
            >
              <span className="font-mono text-[15px] tracking-[.06em] text-gold">
                {settings.inviteCode}
              </span>
              <span className="font-mono text-[11px] text-text-muted flex-none">
                {codeCopied ? "copied!" : "copy"}
              </span>
            </button>
          </div>
          <div className="flex-[2_1_280px] flex flex-col gap-2">
            <label className="font-mono text-[11px] tracking-[.08em] text-text-muted">
              INVITE LINK
            </label>
            <button
              onClick={copyLink}
              className="flex items-center justify-between gap-2.5 bg-code-bg border border-white/10 rounded-[10px] px-[13px] py-[11px] cursor-pointer hover:border-gold/40 transition-colors text-left min-w-0"
            >
              <span className="font-mono text-[13px] text-[#C2C0B9] whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                codestreak.app/join/{settings.inviteCode}
              </span>
              <span className="font-mono text-[11px] text-text-muted flex-none">
                {linkCopied ? "copied!" : "copy"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Streak rules section */}
      <section className="bg-surface border border-white/[0.07] rounded-[15px] px-[22px] py-[22px] flex flex-col gap-2">
        <span className="font-mono text-[11px] tracking-[.12em] text-text-muted mb-1.5">
          WHAT COUNTS TOWARD A STREAK
        </span>
        {RULE_ITEMS.map((item, i) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3.5 py-[13px]"
            style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] text-[#E4E2DB] font-medium">
                {item.label}
              </span>
              <span className="text-[12.5px] text-text-muted">{item.desc}</span>
            </div>
            <Toggle
              checked={rules[item.key]}
              onChange={() => handleToggleRule(item.key)}
              disabled={isPending}
            />
          </div>
        ))}
      </section>

      {/* Danger zone */}
      <section
        className="border rounded-[15px] px-[22px] py-[22px] flex flex-col gap-3.5"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, #E0795E 8%, #141417), #141417)",
          borderColor: "color-mix(in srgb, #E0795E 30%, transparent)",
        }}
      >
        <span
          className="font-mono text-[11px] tracking-[.12em]"
          style={{ color: "#E0795E" }}
        >
          DANGER ZONE
        </span>
        <div className="flex items-center justify-between gap-3.5 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] text-[#E4E2DB] font-medium">
              Archive course
            </span>
            <span className="text-[12.5px] text-text-muted">
              Freezes streaks and hides it from students. Reversible.
            </span>
          </div>
          <button
            onClick={handleArchive}
            disabled={isPending}
            className="flex-none bg-transparent text-[#D7D5CE] border border-white/[0.18] rounded-[9px] px-4 py-[9px] font-sans text-[13px] font-semibold cursor-pointer hover:border-white/30 disabled:opacity-50"
          >
            {settings.isArchived ? "Unarchive" : "Archive"}
          </button>
        </div>
        <div className="flex items-center justify-between gap-3.5 flex-wrap pt-3.5 border-t border-white/[0.05]">
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] text-[#E4E2DB] font-medium">
              Delete course
            </span>
            <span className="text-[12.5px] text-text-muted">
              Permanently removes all student data. Cannot be undone.
            </span>
          </div>
          <button
            onClick={handleDelete}
            className="flex-none font-sans text-[13px] font-semibold cursor-pointer rounded-[9px] px-4 py-[9px] border transition-colors"
            style={{
              background: "color-mix(in srgb, #E0795E 16%, transparent)",
              color: "#E0795E",
              borderColor: "color-mix(in srgb, #E0795E 45%, transparent)",
            }}
          >
            Delete
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={archiveDialogOpen}
        title={settings.isArchived ? "Unarchive this course?" : "Archive this course?"}
        message={
          settings.isArchived
            ? "Students will regain access and streaks will resume."
            : "Streaks will be frozen and the course hidden from students."
        }
        confirmLabel={settings.isArchived ? "Unarchive" : "Archive"}
        danger
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveDialogOpen(false)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete this course?"
        message="All student data, streaks, and submissions will be permanently removed. This cannot be undone."
        confirmLabel="Delete forever"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
      />

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
