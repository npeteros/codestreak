import dynamic from "next/dynamic";
import type { SubmissionVerdict } from "@/lib/types";

const Markdown = dynamic(() => import("@/components/ui/Markdown"));

const VERDICT_LABEL: Record<SubmissionVerdict, string> = {
  CORRECT: "Correct",
  PARTIALLY_CORRECT: "Partially correct",
  INCORRECT: "Incorrect",
  UNABLE_TO_ASSESS: "Unable to assess",
};

const VERDICT_COLORS: Record<SubmissionVerdict, string> = {
  CORRECT: "text-green-400 border-green-400/40",
  PARTIALLY_CORRECT: "text-gold border-gold/40",
  INCORRECT: "text-red-400 border-red-400/40",
  UNABLE_TO_ASSESS: "text-text-muted border-white/[0.15]",
};

interface Props {
  verdict: SubmissionVerdict;
  celebrate: string;
  improve: string;
}

// AI-generated best-effort verdict on a submission (no code execution/judge
// exists in this app — this is an LLM's read of the problem + code).
export function SubmissionFeedbackCard({ verdict, celebrate, improve }: Props) {
  return (
    <div className="flex flex-col gap-[10px] bg-surface border border-white/[0.07] rounded-[15px] p-[18px]">
      <span
        className={`font-mono text-[11px] border rounded-full px-[10px] py-[2px] self-start ${VERDICT_COLORS[verdict]}`}
      >
        AI verdict: {VERDICT_LABEL[verdict]}
      </span>
      {celebrate && (
        <div className="flex flex-col gap-[3px]">
          <span className="font-mono text-[10.5px] text-text-faint uppercase tracking-wide">
            What to celebrate
          </span>
          <div className="markdown-body text-[13.5px] text-[#D7D5CE] leading-[1.6]">
            <Markdown>{celebrate}</Markdown>
          </div>
        </div>
      )}
      {improve && (
        <div className="flex flex-col gap-[3px]">
          <span className="font-mono text-[10.5px] text-text-faint uppercase tracking-wide">
            How to improve
          </span>
          <div className="markdown-body text-[13.5px] text-[#D7D5CE] leading-[1.6]">
            <Markdown>{improve}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
