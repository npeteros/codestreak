"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  listPublicPracticeChallengesPage,
  type PublicPracticeChallengeSummary,
} from "@/lib/actions/publicCatalog";
import type { PracticeCursor } from "@/lib/domain/practiceMerge";
import { SearchInput } from "@/components/ui/SearchInput";

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

type DifficultyFilter = "ALL" | "EASY" | "MEDIUM" | "HARD";
type SortDir = "desc" | "asc";

const selectClass =
  "bg-surface border border-white/[0.08] rounded-[9px] px-3 py-[9px] font-sans text-[13.5px] text-text-primary outline-none focus:border-white/25 transition-colors cursor-pointer";

interface Props {
  courseId: string;
  initialItems: PublicPracticeChallengeSummary[];
  initialCursor: PracticeCursor;
  initialHasMore: boolean;
}

export function PublicChallengesListClient({
  courseId,
  initialItems,
  initialCursor,
  initialHasMore,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("ALL");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const requestId = useRef(0);

  function fetchPage(
    reset: boolean,
    params: { difficulty: DifficultyFilter; sortDir: SortDir },
    cursorArg: PracticeCursor | null
  ) {
    const id = ++requestId.current;
    startTransition(async () => {
      const res = await listPublicPracticeChallengesPage(courseId, {
        cursor: cursorArg ?? undefined,
        difficulty: params.difficulty === "ALL" ? undefined : params.difficulty,
        sortDir: params.sortDir,
      });
      if (id !== requestId.current) return; // superseded by a newer request
      if (res.success) {
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      }
    });
  }

  function loadMore() {
    fetchPage(false, { difficulty, sortDir }, cursor);
  }

  function handleDifficultyChange(next: DifficultyFilter) {
    setDifficulty(next);
    fetchPage(true, { difficulty: next, sortDir }, null);
  }

  function handleSortChange(next: SortDir) {
    setSortDir(next);
    fetchPage(true, { difficulty, sortDir: next }, null);
  }

  const filtersActive = difficulty !== "ALL";
  const searchTerm = search.trim().toLowerCase();
  const visibleItems = searchTerm
    ? items.filter(
        (c) =>
          c.title.toLowerCase().includes(searchTerm) || c.topicTag.toLowerCase().includes(searchTerm)
      )
    : items;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search loaded challenges…" />
        <select
          value={difficulty}
          onChange={(e) => handleDifficultyChange(e.target.value as DifficultyFilter)}
          className={selectClass}
        >
          <option value="ALL">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
        <select
          value={sortDir}
          onChange={(e) => handleSortChange(e.target.value as SortDir)}
          className={selectClass}
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      {searchTerm && hasMore && (
        <p className="text-text-faint text-[12px] font-mono -mt-2">
          Showing matches in the {items.length} loaded — Load more to search further.
        </p>
      )}

      {visibleItems.length === 0 ? (
        <div className="bg-surface border border-white/[0.07] rounded-[15px] p-[22px]">
          <p className="text-text-muted text-sm m-0">
            {items.length === 0
              ? filtersActive
                ? "No challenges match your filters."
                : "No challenges available yet. Check back soon."
              : "No challenges match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {visibleItems.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${courseId}/practice/${c.id}`}
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

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isPending}
          className="self-center bg-transparent text-gold border border-gold/35 rounded-[9px] px-5 py-[9px] font-sans text-[13px] font-semibold cursor-pointer hover:bg-gold/10 transition-colors disabled:opacity-50"
        >
          {isPending ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
