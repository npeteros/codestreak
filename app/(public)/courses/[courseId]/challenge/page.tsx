import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicCourse, getPublicDailyChallenge } from "@/lib/actions/publicCatalog";
import { getCurrentUser } from "@/lib/auth/session";
import { generateMetadata as buildMetadata } from "@/lib/seo/metadata";
import { ChallengeView } from "@/components/challenges/ChallengeView";
import { CodeViewer } from "@/components/challenges/CodeViewer";
import { JoinCourseButton } from "@/components/courses/JoinCourseButton";

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
      path: `/courses/${courseId}/challenge`,
    });
  }

  return buildMetadata({
    title: `Daily Challenge — ${course.name} — CodeStreak`,
    description: `Today's daily coding challenge for ${course.name}.`,
    path: `/courses/${courseId}/challenge`,
  });
}

export default async function PublicDailyChallengePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [{ course }, user] = await Promise.all([getPublicCourse(courseId), getCurrentUser()]);

  if (!course) notFound();

  const result = await getPublicDailyChallenge(courseId);
  const challenge = result.success ? result.challenge : null;
  const viewerRole = !user ? "GUEST" : user.role === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link
          href={`/courses/${courseId}`}
          className="font-mono text-[11.5px] text-text-muted hover:text-text-secondary no-underline"
        >
          ← {course.name}
        </Link>
        <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
          Daily Challenge
        </h1>
        <p className="text-text-muted text-sm">
          Solve it once a day to keep the chain unbroken.
        </p>
      </div>

      {!challenge ? (
        <div className="bg-surface border border-white/[0.07] rounded-[15px] p-[22px]">
          <p className="text-text-muted text-sm m-0">
            No challenge scheduled for today. Check back tomorrow.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 flex-wrap items-stretch">
          <ChallengeView
            title={challenge.title}
            difficulty={challenge.difficulty}
            topicTag={challenge.topicTag}
            description={challenge.description}
          />
          <CodeViewer code={challenge.starterCode} />
        </div>
      )}

      {viewerRole !== "INSTRUCTOR" && (
        <JoinCourseButton
          courseId={courseId}
          isGuest={viewerRole === "GUEST"}
          label="Join course to submit"
          gateMessage="Create a free student account to join this course and submit your solution."
          redirectTo={`/dashboard/student/challenge?courseId=${courseId}`}
        />
      )}
    </div>
  );
}
