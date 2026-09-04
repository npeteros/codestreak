"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { submitPracticeAttempt } from "@/lib/actions/practiceChallenges";
import type { PracticeChallengeDetail } from "@/lib/actions/practiceChallenges";
import { ChallengeView } from "@/components/challenges/ChallengeView";
import { HintChat } from "@/components/challenges/HintChat";
import { SubmissionFeedbackCard } from "@/components/challenges/SubmissionFeedbackCard";
import type { SubmissionAiFeedback } from "@/lib/types";

interface Props {
  courseId: string;
  challengeId: string;
  challenge: PracticeChallengeDetail | null;
  initialFeedback: SubmissionAiFeedback | null;
}

export function PracticeChallengeClient({
  courseId,
  challengeId,
  challenge,
  initialFeedback,
}: Props) {
  const [code, setCode] = useState(challenge?.starterCode ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<SubmissionAiFeedback | null>(initialFeedback);

  if (!challenge) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Link
            href={`/dashboard/student/practice?courseId=${courseId}`}
            className="font-mono text-[11.5px] text-text-muted hover:text-text-secondary no-underline"
          >
            ← Back to Practice
          </Link>
          <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
            Challenge not found
          </h1>
        </div>
        <div className="bg-surface border border-white/[0.07] rounded-[15px] p-[22px]">
          <p className="text-text-muted text-sm m-0">
            This challenge isn&apos;t available. It may have been removed or isn&apos;t published yet.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setJustLogged(false);
    const result = await submitPracticeAttempt(courseId, challengeId, code);
    if (result.success) {
      setJustLogged(true);
      setFeedback(result.feedback);
    } else {
      setError("Something went wrong. Try again.");
    }
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link
          href={`/dashboard/student/practice?courseId=${courseId}`}
          className="font-mono text-[11.5px] text-text-muted hover:text-text-secondary no-underline"
        >
          ← Back to Practice
        </Link>
      </div>

      <div className="flex gap-4 flex-wrap items-stretch">
        <div className="flex-[1_1_300px] min-w-[280px] flex flex-col gap-4">
          <ChallengeView
            title={challenge.title}
            difficulty={challenge.difficulty}
            topicTag={challenge.topicTag}
            description={challenge.description}
          />
          <HintChat courseId={courseId} challengeId={challengeId} draftCode={code} />
        </div>

        <div className="flex-[1.3_1_340px] min-w-[300px] flex flex-col border border-white/[0.08] rounded-[15px] overflow-hidden bg-code-bg">
          <div className="flex items-center justify-between px-[15px] py-[11px] bg-[#131316] border-b border-white/[0.07]">
            <div className="flex items-center gap-[9px]">
              <span className="w-[9px] h-[9px] rounded-full bg-gold inline-block" />
              <span className="font-mono text-[12.5px] text-[#D7D5CE]">solution</span>
            </div>
          </div>

          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setJustLogged(false);
            }}
            spellCheck={false}
            className="flex-1 min-h-[230px] w-full resize-y border-none outline-none bg-code-bg text-[#EDEBE4] font-mono text-[13px] leading-[1.75] px-[18px] py-[16px]"
          />

          <div className="flex items-center justify-between gap-3 px-[15px] py-[13px] border-t border-white/[0.07] bg-[#131316] flex-wrap">
            {!justLogged ? (
              <span className="font-mono text-[11.5px] text-text-faint">
                {error ?? "Attempt anytime — retakes always count."}
              </span>
            ) : (
              <div className="flex items-center gap-[10px]">
                <span className="w-[22px] h-[22px] rounded-full bg-gold text-bg inline-flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
                <span className="text-[13px] text-[#D7D5CE]">
                  Attempt logged — <strong className="text-gold">keep going!</strong>
                </span>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-gold text-bg border-none rounded-[9px] px-5 py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Submit attempt"}
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <SubmissionFeedbackCard
          verdict={feedback.verdict}
          celebrate={feedback.celebrate}
          improve={feedback.improve}
        />
      )}
    </div>
  );
}
