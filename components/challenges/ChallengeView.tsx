import dynamic from "next/dynamic";
import type { ChallengeDifficulty } from "@/lib/types";

const Markdown = dynamic(() => import("@/components/ui/Markdown"));

const DIFFICULTY_LABEL: Record<ChallengeDifficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  EASY: "text-green-400 border-green-400/40",
  MEDIUM: "text-gold border-gold/40",
  HARD: "text-red-400 border-red-400/40",
};

interface Props {
  title: string;
  difficulty: ChallengeDifficulty;
  topicTag: string;
  description: string;
}

// Read-only info card (difficulty badge, topic tag, title, description) shared
// between the authenticated challenge clients (interactive editor alongside)
// and the guest-facing public challenge pages (view-only, no editor).
export function ChallengeView({ title, difficulty, topicTag, description }: Props) {
  return (
    <div className="flex-[1_1_300px] min-w-[280px] bg-surface border border-white/[0.07] rounded-[15px] p-[22px] flex flex-col gap-[14px]">
      <div className="flex items-center gap-[9px]">
        <span
          className={`font-mono text-[11px] border rounded-full px-[10px] py-[2px] ${DIFFICULTY_COLORS[difficulty]}`}
        >
          {DIFFICULTY_LABEL[difficulty]}
        </span>
        <span className="font-mono text-[11px] text-text-muted">{topicTag}</span>
      </div>

      <h2 className="font-serif text-[25px] text-text-primary font-normal leading-[1.1] m-0">
        {title}
      </h2>

      <div className="max-h-90 overflow-y-auto pr-1 -mr-1">
        <div className="markdown-body text-[14.5px] text-[#C2C0B9] leading-[1.7]">
          <Markdown>{description}</Markdown>
        </div>
      </div>
    </div>
  );
}
