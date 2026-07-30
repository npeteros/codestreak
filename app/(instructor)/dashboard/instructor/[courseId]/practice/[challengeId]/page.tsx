import { redirect } from "next/navigation";
import { getSettings, getPracticeChallengeForInstructor } from "@/lib/actions/instructor";
import { PracticeChallengeFormClient } from "@/app/(instructor)/_components/PracticeChallengeFormClient";

export default async function EditPracticeChallengePage({
  params,
}: {
  params: Promise<{ courseId: string; challengeId: string }>;
}) {
  const { courseId, challengeId } = await params;

  const result = await getSettings(courseId);
  if (!result.success) {
    if (result.error === "unauthenticated") redirect("/login");
    return (
      <div className="flex flex-col gap-3 py-14 text-center">
        <p className="font-serif text-[2rem] text-text-primary font-normal">
          No course found
        </p>
        <p className="text-sm text-text-faint">
          Contact support to create your course.
        </p>
      </div>
    );
  }

  const challengeResult = await getPracticeChallengeForInstructor(courseId, challengeId);
  const challenge = challengeResult.success ? challengeResult.challenge : null;

  if (!challenge) {
    return (
      <div className="flex flex-col gap-3 py-14 text-center">
        <p className="font-serif text-[2rem] text-text-primary font-normal">
          Challenge not found
        </p>
        <p className="text-sm text-text-faint">
          It may have been deleted.
        </p>
      </div>
    );
  }

  return (
    <PracticeChallengeFormClient
      courseId={courseId}
      languageTag={result.settings.languageTag}
      initialChallenge={challenge}
    />
  );
}
