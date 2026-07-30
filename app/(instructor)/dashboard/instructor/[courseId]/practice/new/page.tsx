import { redirect } from "next/navigation";
import { getSettings } from "@/lib/actions/instructor";
import { PracticeChallengeFormClient } from "@/app/(instructor)/_components/PracticeChallengeFormClient";

export default async function NewPracticeChallengePage({
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

  return (
    <PracticeChallengeFormClient
      courseId={courseId}
      languageTag={result.settings.languageTag}
      initialChallenge={null}
    />
  );
}
