import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getPublicCourse,
  getPublicDailyChallenge,
  getPublicChallengeHistory,
  getPublicLeaderboard,
} from "@/lib/actions/publicCatalog";
import { getCurrentUser } from "@/lib/auth/session";
import { generateMetadata as buildMetadata } from "@/lib/seo/metadata";
import { ChallengeView } from "@/components/challenges/ChallengeView";
import { JoinCourseButton } from "@/components/courses/JoinCourseButton";

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const { courseId } = await params;
  const { course } = await getPublicCourse(courseId);

  if (!course) {
    return buildMetadata({
      title: "Course not found — CodeStreak",
      description: "This course isn't available.",
      path: `/courses/${courseId}`,
    });
  }

  return buildMetadata({
    title: `${course.name} — CodeStreak`,
    description: course.description || `Join ${course.name} on CodeStreak and build the habit.`,
    path: `/courses/${courseId}`,
    ogImage: null, // opengraph-image.tsx sibling supplies the og:image tags
  });
}

// The leaderboard reads every enrolled student's streak history, a much
// heavier per-course query than anything else on this route — ISR keeps
// that cost to once per cache window instead of once per anonymous visit.
export const revalidate = 300;

export default async function PublicCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [{ course }, dailyResult, historyResult, leaderboardResult, user] = await Promise.all([
    getPublicCourse(courseId),
    getPublicDailyChallenge(courseId),
    getPublicChallengeHistory(courseId),
    getPublicLeaderboard(courseId),
    getCurrentUser(),
  ]);

  if (!course) notFound();

  const challenge = dailyResult.success ? dailyResult.challenge : null;
  const history = historyResult.success ? historyResult.items : [];
  const leaderboard = leaderboardResult.success ? leaderboardResult.entries : [];
  const viewerRole = !user ? "GUEST" : user.role === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT";

  return (
    <div className="flex flex-col gap-9">
      <div className="font-mono text-xs text-text-faint">
        <Link href="/" className="hover:text-text-secondary">
          Courses
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-text-muted">{course.languageTag}</span>
      </div>

      {/* HERO */}
      <section className="flex flex-col gap-5">
        <span className="inline-block self-start font-mono text-[11px] text-gold border border-gold/40 rounded-full px-2.5 py-1">
          {course.languageTag}
        </span>
        <h1 className="m-0 font-serif font-normal text-[2.2rem] text-text-primary tracking-[-0.01em] leading-tight max-w-2xl">
          {course.name}
        </h1>
        {course.description && (
          <p className="m-0 max-w-2xl text-[16px] text-text-secondary leading-relaxed">
            {course.description}
          </p>
        )}
        <div className="flex items-center gap-6 flex-wrap pt-1.5">
          {course.instructorName && (
            <span className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-[8px] bg-gold/[0.16] flex items-center justify-center font-mono text-[11px] text-gold flex-none">
                {course.instructorInitial}
              </span>
              <span className="text-[13.5px] text-text-secondary">{course.instructorName}</span>
            </span>
          )}
          <span className="font-mono text-xs text-text-faint">
            {course.enrolledCount} enrolled
          </span>
          <span className="font-mono text-xs text-text-faint">Free</span>
        </div>
        {viewerRole !== "INSTRUCTOR" && (
          <div className="flex items-center gap-3.5 pt-1.5 flex-wrap">
            <JoinCourseButton courseId={courseId} isGuest={viewerRole === "GUEST"} label="Enroll — it's free" />
            <a
              href="#challenge"
              className="border border-white/[0.14] rounded-[10px] px-[22px] py-3 text-[15px] text-text-secondary no-underline hover:text-text-primary hover:border-white/25 transition-colors"
            >
              Preview today&rsquo;s challenge
            </a>
          </div>
        )}
      </section>

      {/* BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="flex flex-col gap-8 min-w-0">
          <section id="challenge" className="flex flex-col gap-3.5">
            <h2 className="m-0 font-serif font-normal text-[22px] text-text-primary">
              Today&rsquo;s challenge
            </h2>
            {challenge ? (
              <div className="flex flex-col gap-3">
                <ChallengeView
                  title={challenge.title}
                  difficulty={challenge.difficulty}
                  topicTag={challenge.topicTag}
                  description={challenge.description}
                />
                <span className="font-mono text-xs text-text-muted">
                  Sign in to write and submit your solution.
                </span>
              </div>
            ) : (
              <div className="bg-surface border border-white/[0.07] rounded-[15px] p-[22px]">
                <p className="text-text-muted text-sm m-0">
                  No challenge scheduled for today. Check back tomorrow.
                </p>
              </div>
            )}
          </section>

          {history.length > 0 && (
            <section className="flex flex-col gap-3.5">
              <h2 className="m-0 font-serif font-normal text-[22px] text-text-primary">
                Challenge history
              </h2>
              <div className="flex flex-col gap-2.5">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="bg-surface border border-white/[0.06] rounded-xl px-4 py-3.5 flex items-center justify-between gap-3.5 flex-wrap"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm text-[#E4E2DB] font-medium">{h.title}</span>
                      <span className="font-mono text-[11px] text-text-faint">{h.date}</span>
                    </div>
                    <span className="font-mono text-[10.5px] text-text-muted border border-white/10 rounded-full px-2.5 py-0.5 flex-none">
                      {DIFFICULTY_LABEL[h.difficulty]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="flex flex-col gap-4.5 lg:sticky lg:top-[88px]">
          {course.instructorName && (
            <div className="bg-surface border border-white/[0.07] rounded-[16px] p-5 flex flex-col gap-3.5">
              <span className="font-mono text-[10px] tracking-wide text-text-faint">
                INSTRUCTOR
              </span>
              <div className="flex items-center gap-3">
                <span className="w-[42px] h-[42px] rounded-[11px] bg-gold/[0.16] flex items-center justify-center font-mono text-[15px] text-gold flex-none">
                  {course.instructorInitial}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[14.5px] font-semibold text-[#E4E2DB]">
                    {course.instructorName}
                  </span>
                  <span className="font-mono text-[10.5px] text-text-muted">Instructor</span>
                </div>
              </div>
              {course.otherCourse && (
                <Link
                  href={`/courses/${course.otherCourse.id}`}
                  className="font-mono text-[11.5px] border-t border-white/[0.06] pt-3 text-gold hover:text-[#F0F0F0]"
                >
                  Also teaches: {course.otherCourse.name} →
                </Link>
              )}
            </div>
          )}

          {leaderboard.length > 0 && (
            <div className="bg-surface border border-white/[0.07] rounded-[16px] p-5 flex flex-col gap-3">
              <span className="font-mono text-[10px] tracking-wide text-text-faint">
                STREAK LEADERBOARD
              </span>
              {leaderboard.map((l) => (
                <div key={l.rank} className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-text-faint w-4 flex-none">{l.rank}</span>
                  <span className="text-[13px] text-text-secondary flex-1 min-w-0 truncate">
                    {l.name}
                  </span>
                  <span className="font-mono text-xs text-gold">{l.streak}d</span>
                </div>
              ))}
            </div>
          )}

          {viewerRole !== "INSTRUCTOR" && (
            <div className="bg-gradient-to-br from-gold/10 to-surface border border-gold/30 rounded-[16px] p-5 flex flex-col gap-2.5">
              <span className="text-sm font-semibold text-text-primary">Free to enroll</span>
              <p className="m-0 text-[12.5px] text-text-secondary leading-relaxed">
                No cost, no catch. Start today&rsquo;s challenge in under a minute.
              </p>
              <JoinCourseButton courseId={courseId} isGuest={viewerRole === "GUEST"} label="Enroll now" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
