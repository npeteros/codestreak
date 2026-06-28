"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitChallenge } from "@/lib/actions/challenges";

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topicTag: string;
  starterCode: string;
}

interface Props {
  courseId: string;
  challenge: Challenge | null;
  alreadySubmitted: boolean;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "text-green-400 border-green-400/40",
  MEDIUM: "text-gold border-gold/40",
  HARD: "text-red-400 border-red-400/40",
};

export function ChallengeClient({ courseId, challenge, alreadySubmitted }: Props) {
  const [code, setCode] = useState(challenge?.starterCode ?? "");
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!challenge) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
            Daily Challenge
          </h1>
          <p className="text-text-muted text-sm">
            Solve it once a day to keep the chain unbroken.
          </p>
        </div>
        <div className="bg-surface border border-white/[0.07] rounded-[15px] p-[22px]">
          <p className="text-text-muted text-sm m-0">
            No challenge scheduled for today. Check back tomorrow.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (submitted || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await submitChallenge(courseId, challenge!.id, code);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(
        result.error === "already_submitted"
          ? "You've already submitted today."
          : "Something went wrong. Try again."
      );
    }
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
          Daily Challenge
        </h1>
        <p className="text-text-muted text-sm">
          Solve it once a day to keep the chain unbroken.
        </p>
      </div>

      {/* Content */}
      <div className="flex gap-4 flex-wrap items-stretch">
        {/* Problem statement */}
        <div className="flex-[1_1_300px] min-w-[280px] bg-surface border border-white/[0.07] rounded-[15px] p-[22px] flex flex-col gap-[14px]">
          <div className="flex items-center gap-[9px]">
            <span
              className={`font-mono text-[11px] border rounded-full px-[10px] py-[2px] ${DIFFICULTY_COLORS[challenge.difficulty]}`}
            >
              {DIFFICULTY_LABEL[challenge.difficulty]}
            </span>
            <span className="font-mono text-[11px] text-text-muted">
              {challenge.topicTag}
            </span>
          </div>

          <h2 className="font-serif text-[25px] text-text-primary font-normal leading-[1.1] m-0">
            {challenge.title}
          </h2>

          <p className="text-[14.5px] text-[#C2C0B9] leading-[1.7] m-0 whitespace-pre-wrap">
            {challenge.description}
          </p>
        </div>

        {/* Editor */}
        <div className="flex-[1.3_1_340px] min-w-[300px] flex flex-col border border-white/[0.08] rounded-[15px] overflow-hidden bg-code-bg">
          {/* Editor header */}
          <div className="flex items-center justify-between px-[15px] py-[11px] bg-[#131316] border-b border-white/[0.07]">
            <div className="flex items-center gap-[9px]">
              <span className="w-[9px] h-[9px] rounded-full bg-gold inline-block" />
              <span className="font-mono text-[12.5px] text-[#D7D5CE]">
                solution
              </span>
            </div>
          </div>

          {/* Code textarea */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={submitted}
            spellCheck={false}
            className="flex-1 min-h-[230px] w-full resize-y border-none outline-none bg-code-bg text-[#EDEBE4] font-mono text-[13px] leading-[1.75] px-[18px] py-[16px] disabled:opacity-60"
          />

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-[15px] py-[13px] border-t border-white/[0.07] bg-[#131316] flex-wrap">
            {!submitted ? (
              <>
                <span className="font-mono text-[11.5px] text-text-faint">
                  {error ?? "Submitting logs today to your streak."}
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-gold text-bg border-none rounded-[9px] px-5 py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting…" : "Submit solution"}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-[10px]">
                  <span className="w-[22px] h-[22px] rounded-full bg-gold text-bg inline-flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[13px] text-[#D7D5CE]">
                    Logged — <strong className="text-gold">Streak extended!</strong>
                  </span>
                </div>
                <a
                  href={`/dashboard/student/journal?courseId=${courseId}`}
                  className="text-gold border border-gold/40 rounded-[9px] px-4 py-[9px] font-sans text-[13px] font-semibold cursor-pointer hover:bg-gold/10 transition-colors no-underline"
                >
                  View AI reflection →
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
