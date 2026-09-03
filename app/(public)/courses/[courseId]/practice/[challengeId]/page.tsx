import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicCourse, getPublicPracticeChallenge } from "@/lib/actions/publicCatalog";
import { getCurrentUser } from "@/lib/auth/session";
import { generateMetadata as buildMetadata } from "@/lib/seo/metadata";
import { ChallengeView } from "@/components/challenges/ChallengeView";
import { CodeViewer } from "@/components/challenges/CodeViewer";
import { JoinCourseButton } from "@/components/courses/JoinCourseButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string; challengeId: string }>;
}): Promise<Metadata> {
  const { courseId, challengeId } = await params;
  const [{ course }, result] = await Promise.all([
    getPublicCourse(courseId),
    getPublicPracticeChallenge(courseId, challengeId),
  ]);
  const challenge = result.success ? result.challenge : null;

  if (!course || !challenge) {
    return buildMetadata({
      title: "Challenge not found — CodeStreak",
      description: "This challenge isn't available.",
      path: `/courses/${courseId}/practice/${challengeId}`,
    });
  }

  return buildMetadata({
    title: `${challenge.title} — ${course.name} — CodeStreak`,
    description: `A ${challenge.difficulty.toLowerCase()} ${challenge.topicTag} practice challenge from ${course.name}.`,
    path: `/courses/${courseId}/practice/${challengeId}`,
    ogImage: null, // opengraph-image.tsx sibling supplies the og:image tags
  });
}

export default async function PublicPracticeChallengePage({
  params,
}: {
  params: Promise<{ courseId: string; challengeId: string }>;
}) {
  const { courseId, challengeId } = await params;
  const [{ course }, result, user] = await Promise.all([
    getPublicCourse(courseId),
    getPublicPracticeChallenge(courseId, challengeId),
    getCurrentUser(),
  ]);

  if (!course) notFound();

  const challenge = result.success ? result.challenge : null;
  const viewerRole = !user ? "GUEST" : user.role === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link
          href={`/courses/${courseId}/practice`}
          className="font-mono text-[11.5px] text-text-muted hover:text-text-secondary no-underline"
        >
          ← Back to Practice
        </Link>
      </div>

      {!challenge ? (
        <div className="bg-surface border border-white/[0.07] rounded-[15px] p-[22px]">
          <p className="text-text-muted text-sm m-0">
            This challenge isn&apos;t available. It may have been removed or isn&apos;t published yet.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 flex-wrap items-stretch">
            <ChallengeView
              title={challenge.title}
              difficulty={challenge.difficulty}
              topicTag={challenge.topicTag}
              description={challenge.description}
            />
            <CodeViewer code={challenge.starterCode} />
          </div>

          {viewerRole !== "INSTRUCTOR" && (
            <JoinCourseButton
              courseId={courseId}
              isGuest={viewerRole === "GUEST"}
              label="Join course to attempt"
              gateMessage="Create a free student account to join this course and log your attempt."
              redirectTo={`/dashboard/student/practice/${challengeId}?courseId=${courseId}`}
            />
          )}
        </>
      )}
    </div>
  );
}
