"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitChallenge } from "@/lib/actions/challenges";
import { ChallengeView } from "@/components/challenges/ChallengeView";
import { CodeEditor } from "@/components/challenges/CodeEditor";
import { EditorThemePicker } from "@/components/challenges/EditorThemePicker";
import { LanguagePicker } from "@/components/challenges/LanguagePicker";
import { normalizeLanguageTag } from "@/components/challenges/editorLanguages";
import { HintChat } from "@/components/challenges/HintChat";
import { SubmissionFeedbackCard } from "@/components/challenges/SubmissionFeedbackCard";
import { useEditorTheme } from "@/lib/hooks/useEditorTheme";
import type { SubmissionAiFeedback } from "@/lib/types";

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topicTag: string;
  starterCode: string;
  languageTag: string;
}

interface Props {
  courseId: string;
  challenge: Challenge | null;
  alreadySubmitted: boolean;
  submittedCode: string | null;
  initialFeedback: SubmissionAiFeedback | null;
}

export function ChallengeClient({
  courseId,
  challenge,
  alreadySubmitted,
  submittedCode,
  initialFeedback,
}: Props) {
  const [code, setCode] = useState(
    submittedCode ?? challenge?.starterCode ?? ""
  );
  const [savedCode, setSavedCode] = useState(
    submittedCode ?? challenge?.starterCode ?? ""
  );
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { themeKey, setThemeKey } = useEditorTheme();
  const [language, setLanguage] = useState(() => normalizeLanguageTag(challenge?.languageTag));
  const [feedback, setFeedback] = useState<SubmissionAiFeedback | null>(initialFeedback);

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
    if (submitting || (submitted && code === savedCode)) return;
    setSubmitting(true);
    setError(null);
    const result = await submitChallenge(courseId, challenge!.id, code);
    if (result.success) {
      setSubmitted(true);
      setSavedCode(code);
      setFeedback(result.feedback);
    } else {
      setError("Something went wrong. Try again.");
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
        <div className="flex-[1_1_300px] min-w-[280px] flex flex-col gap-4">
          <ChallengeView
            title={challenge.title}
            difficulty={challenge.difficulty}
            topicTag={challenge.topicTag}
            description={challenge.description}
          />
          <HintChat courseId={courseId} challengeId={challenge.id} draftCode={code} />
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
            <div className="flex items-center gap-2">
              <LanguagePicker value={language} onChange={setLanguage} />
              <EditorThemePicker value={themeKey} onChange={setThemeKey} />
            </div>
          </div>

          {/* Code editor */}
          <CodeEditor
            value={code}
            onChange={setCode}
            languageTag={language}
            themeKey={themeKey}
          />

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-[15px] py-[13px] border-t border-white/[0.07] bg-[#131316] flex-wrap">
            {!submitted ? (
              <span className="font-mono text-[11.5px] text-text-faint">
                {error ?? "Submitting logs today to your streak."}
              </span>
            ) : (
              <div className="flex items-center gap-[10px]">
                <span className="w-[22px] h-[22px] rounded-full bg-gold text-bg inline-flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
                <span className="text-[13px] text-[#D7D5CE]">
                  {error ?? (
                    <>
                      Logged — <strong className="text-gold">Streak extended!</strong>
                    </>
                  )}
                </span>
              </div>
            )}
            <div className="flex items-center gap-[10px]">
              {submitted && (
                <a
                  href={`/dashboard/student/journal?courseId=${courseId}`}
                  className="text-gold border border-gold/40 rounded-[9px] px-4 py-[9px] font-sans text-[13px] font-semibold cursor-pointer hover:bg-gold/10 transition-colors no-underline"
                >
                  View AI reflection →
                </a>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting || (submitted && code === savedCode)}
                className="bg-gold text-bg border-none rounded-[9px] px-5 py-[10px] font-sans text-[13.5px] font-semibold cursor-pointer hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting
                  ? submitted
                    ? "Saving…"
                    : "Submitting…"
                  : submitted
                    ? "Save changes"
                    : "Submit solution"}
              </button>
            </div>
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
