"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  deletePracticeChallenge,
  listPracticeChallengesForInstructor,
  type PracticeChallengeRow,
} from "@/lib/actions/instructor";
import { useToast } from "@/lib/hooks/useToast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Difficulty = "EASY" | "MEDIUM" | "HARD";

function difficultyBadge(d: Difficulty) {
  return [
    "font-mono text-[11px] tracking-[.06em] px-2 py-0.5 rounded-[5px]",
    d === "EASY"
      ? "text-emerald-400 bg-emerald-400/10"
      : d === "HARD"
        ? "text-risk bg-risk/10"
        : "text-gold bg-gold/10",
  ].join(" ");
}

interface Props {
  courseId: string;
  initialChallenges: PracticeChallengeRow[];
}

export function PracticeChallengeListClient({ courseId, initialChallenges }: Props) {
  const { toast, showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [challenges, setChallenges] = useState(initialChallenges);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refreshChallenges() {
    const result = await listPracticeChallengesForInstructor(courseId);
    if (result.success) setChallenges(result.challenges);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(id);
    startTransition(async () => {
      const res = await deletePracticeChallenge(courseId, id);
      setDeletingId(null);
      if (res.success) {
        showToast("Challenge deleted");
        refreshChallenges();
      } else {
        showToast("Failed to delete — try again");
      }
    });
  }

  return (
    <div className="flex flex-col gap-[18px]" style={{ animation: "csFade .25s ease" }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif font-normal text-[1.7rem] text-text-primary">Practice</h2>
          <p className="text-sm text-text-muted">
            Challenges students can browse and attempt anytime, with unlimited retakes.
          </p>
        </div>
        <Link
          href={`/dashboard/instructor/${courseId}/practice/new`}
          className="bg-gold text-bg border-none rounded-[9px] px-5 py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-105 transition-all no-underline"
        >
          + New challenge
        </Link>
      </div>

      {challenges.length === 0 ? (
        <div className="bg-surface border border-white/[0.07] rounded-[15px] p-[22px]">
          <p className="text-text-muted text-sm m-0">
            No challenges yet. Add one to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {challenges.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-2.5 p-[18px] rounded-[14px] border border-white/[0.08] bg-surface"
            >
              <div className="flex items-start justify-between gap-2.5">
                <span className={difficultyBadge(c.difficulty)}>{c.difficulty}</span>
                <div className="flex gap-1.5">
                  {c.origin === "DAILY_ARCHIVE" && (
                    <span
                      title="Originally created via Daily Challenge, now archived into Practice"
                      className="font-mono text-[11px] tracking-[.06em] px-2 py-0.5 rounded-[5px] text-text-muted bg-white/[0.06]"
                    >
                      ARCHIVED
                    </span>
                  )}
                  {c.isDraft && (
                    <span className="font-mono text-[11px] tracking-[.06em] px-2 py-0.5 rounded-[5px] text-text-muted bg-white/[0.06]">
                      DRAFT
                    </span>
                  )}
                </div>
              </div>
              <div className="font-serif text-[18px] text-text-primary leading-[1.2]">
                {c.title}
              </div>
              <div className="text-[13px] text-text-secondary leading-[1.55] line-clamp-3">
                {c.description}
              </div>
              <div className="mt-auto flex gap-2 pt-1">
                <Link
                  href={`/dashboard/instructor/${courseId}/practice/${c.id}`}
                  className="bg-transparent text-text-secondary border border-white/[0.14] rounded-[8px] px-3.5 py-1.5 font-sans text-[12.5px] font-semibold cursor-pointer hover:border-white/25 no-underline"
                >
                  Edit
                </Link>
                <button
                  onClick={() => setDeleteTarget({ id: c.id, title: c.title })}
                  disabled={isPending && deletingId === c.id}
                  className="bg-transparent text-risk border border-risk/35 rounded-[8px] px-3.5 py-1.5 font-sans text-[12.5px] font-semibold cursor-pointer hover:bg-risk/10 disabled:opacity-50"
                >
                  {deletingId === c.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this challenge?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be removed from the library.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
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
