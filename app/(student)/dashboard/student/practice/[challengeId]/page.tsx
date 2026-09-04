import { requireUidOrRedirect } from "@/lib/auth/session";
import { listEnrolledCourses } from "@/lib/repositories/enrollments";
import { getPracticeChallenge } from "@/lib/actions/practiceChallenges";
import { PracticeChallengeClient } from "./PracticeChallengeClient";

export default async function PracticeChallengeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ challengeId: string }>;
  searchParams: Promise<{ courseId?: string }>;
}) {
  const uid = await requireUidOrRedirect();

  const { challengeId } = await params;
  const { courseId: queryCourseId } = await searchParams;
  const hub = await listEnrolledCourses(uid);

  const courseIds = hub.map(({ data: d }) => d.courseId).filter((id): id is string => Boolean(id));
  const validIds = new Set(courseIds);
  const courseId =
    queryCourseId && validIds.has(queryCourseId)
      ? queryCourseId
      : (courseIds[0] ?? "");

  if (!courseId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
          Practice
        </h1>
        <p className="text-text-muted text-sm">
          You&apos;re not enrolled in any courses yet.
        </p>
      </div>
    );
  }

  const result = await getPracticeChallenge(courseId, challengeId);

  return (
    <PracticeChallengeClient
      courseId={courseId}
      challengeId={challengeId}
      challenge={result.success ? result.challenge : null}
      initialFeedback={result.success ? result.feedback : null}
    />
  );
}
