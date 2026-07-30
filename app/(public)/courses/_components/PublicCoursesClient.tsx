"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Users } from "lucide-react";
import type { PublicCourseSummary } from "@/lib/actions/publicCatalog";

type ViewerRole = "GUEST" | "STUDENT" | "INSTRUCTOR";
type SortBy = "popular" | "az";

interface Props {
  initialCourses: PublicCourseSummary[];
  viewerRole: ViewerRole;
}

export function PublicCoursesClient({ initialCourses, viewerRole }: Props) {
  const [language, setLanguage] = useState("All");
  const [sortBy, setSortBy] = useState<SortBy>("popular");

  // Students only need to see courses they haven't joined yet — guests and
  // instructors see the full catalog (joined is always false for them).
  const baseCourses = useMemo(
    () => (viewerRole === "STUDENT" ? initialCourses.filter((c) => !c.joined) : initialCourses),
    [initialCourses, viewerRole]
  );

  const languages = useMemo(
    () => ["All", ...new Set(baseCourses.map((c) => c.languageTag))],
    [baseCourses]
  );

  const filteredCourses = useMemo(() => {
    const list =
      language === "All" ? baseCourses.slice() : baseCourses.filter((c) => c.languageTag === language);
    list.sort((a, b) =>
      sortBy === "popular" ? b.enrolledCount - a.enrolledCount : a.name.localeCompare(b.name)
    );
    return list;
  }, [baseCourses, language, sortBy]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif font-normal text-[2.2rem] text-text-primary tracking-[-0.01em]">
          Browse courses
        </h1>
        <p className="text-sm text-text-muted">
          {filteredCourses.length} free {filteredCourses.length === 1 ? "course" : "courses"}. Pick
          one, start a streak.
        </p>
      </div>

      {baseCourses.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {languages.map((lang) => {
              const active = lang === language;
              return (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={
                    active
                      ? "font-mono text-xs rounded-full px-3.5 py-1.5 border border-transparent bg-gold text-bg font-semibold cursor-pointer"
                      : "font-mono text-xs rounded-full px-3.5 py-1.5 border border-white/[0.12] bg-transparent text-text-secondary font-medium cursor-pointer hover:border-white/25 transition-colors"
                  }
                >
                  {lang}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 flex-none">
            <span className="font-mono text-[11px] text-text-faint">SORT</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="bg-surface text-[#EDEBE4] border border-white/10 rounded-[9px] px-[11px] py-2 font-mono text-[12.5px] outline-none cursor-pointer"
            >
              <option value="popular">Most popular</option>
              <option value="az">A–Z</option>
            </select>
          </div>
        </div>
      )}

      {baseCourses.length === 0 ? (
        <div className="border border-dashed border-white/15 rounded-[15px] px-6 py-12 flex flex-col items-center gap-1.5 text-center">
          <BookOpen size={20} className="text-text-faint" />
          <span className="text-[14px] text-[#E4E2DB] font-medium">
            Nothing to join right now
          </span>
          <span className="text-[12.5px] text-text-muted">
            {viewerRole === "STUDENT"
              ? "You’re in every public course available. Ask your instructor for an invite link to join a private one."
              : "Check back soon for new public courses."}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
          {filteredCourses.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="bg-surface border border-white/[0.07] rounded-[16px] p-5 flex flex-col gap-3.5 no-underline hover:border-gold/45 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] text-gold border border-gold/40 rounded-full px-[9px] py-0.5">
                  {c.languageTag}
                </span>
              </div>

              <div className="font-serif text-[19px] text-text-primary leading-tight">
                {c.name}
              </div>

              {c.description && (
                <p className="text-[13px] text-text-muted leading-[1.55] flex-1 line-clamp-2 m-0">
                  {c.description}
                </p>
              )}

              {c.instructorName && (
                <div className="flex items-center gap-2">
                  <span className="w-[22px] h-[22px] rounded-[7px] bg-gold/[0.16] flex items-center justify-center font-mono text-[10px] text-gold flex-none">
                    {c.instructorInitial}
                  </span>
                  <span className="text-[12.5px] text-text-secondary">{c.instructorName}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-text-faint pt-2.5 border-t border-white/[0.06]">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {c.enrolledCount} enrolled
                </span>
                {c.hasChallengeToday && <span className="text-gold">Challenge live today</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
