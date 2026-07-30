"use client";

import Link from "next/link";
import type { PracticeChallengeSummary } from "@/lib/actions/practiceChallenges";

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

interface Props {
  courseId: string;
  challenges: PracticeChallengeSummary[];
}

export function ChallengesListClient({ courseId, challenges }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
          Practice
        </h1>
        <p className="text-text-muted text-sm">
          Attempt any challenge anytime, as many times as you like.
        </p>
      </div>

      {challenges.length === 0 ? (
        <div className="bg-surface border border-white/[0.07] rounded-[15px] p-[22px]">
          <p className="text-text-muted text-sm m-0">
            No challenges available yet. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {challenges.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/student/practice/${c.id}?courseId=${courseId}`}
              className="flex flex-col gap-2.5 p-[18px] rounded-[14px] border border-white/[0.08] bg-surface hover:border-white/20 transition-colors no-underline"
            >
              <div className="flex items-start gap-[9px] flex-col">
                <span
                  className={`font-mono text-[11px] border rounded-full px-[10px] py-[2px] ${DIFFICULTY_COLORS[c.difficulty]}`}
                >
                  {DIFFICULTY_LABEL[c.difficulty]}
                </span>
                <span className="font-mono text-[11px] text-text-muted">
                  {c.topicTag}
                </span>
              </div>
              <div className="font-serif text-[18px] text-text-primary leading-[1.2]">
                {c.title}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
