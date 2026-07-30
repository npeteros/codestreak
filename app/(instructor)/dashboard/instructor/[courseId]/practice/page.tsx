import { redirect } from "next/navigation";
import { getSettings, listPracticeChallengesForInstructor } from "@/lib/actions/instructor";
import { PracticeChallengeListClient } from "@/app/(instructor)/_components/PracticeChallengeListClient";

export default async function PracticeChallengesPage({
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

  const challengesResult = await listPracticeChallengesForInstructor(courseId);

  return (
    <PracticeChallengeListClient
      courseId={courseId}
      initialChallenges={challengesResult.success ? challengesResult.challenges : []}
    />
  );
}
