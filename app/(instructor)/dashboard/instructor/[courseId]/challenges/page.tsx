import { redirect } from "next/navigation";
import {
  getSettings,
  getTodayInstructorChallenge,
  getLatestDraftChallenge,
} from "@/lib/actions/instructor";
import { ChallengesClient } from "@/app/(instructor)/_components/ChallengesClient";

export default async function InstructorChallengesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

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

  const today = new Date().toISOString().slice(0, 10);
  const [todayResult, draftResult] = await Promise.all([
    getTodayInstructorChallenge(courseId),
    getLatestDraftChallenge(courseId),
  ]);

  return (
    <ChallengesClient
      courseId={courseId}
      defaultDate={today}
      languageTag={result.settings.languageTag}
      initialTodayChallenge={
        todayResult.success ? todayResult.challenge : null
      }
      initialDraftChallenge={
        draftResult.success ? draftResult.challenge : null
      }
    />
  );
}
