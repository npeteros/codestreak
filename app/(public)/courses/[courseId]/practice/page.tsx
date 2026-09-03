import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublicCourse, listPublicPracticeChallengesPage } from "@/lib/actions/publicCatalog";
import { INITIAL_PRACTICE_CURSOR } from "@/lib/domain/practiceMerge";
import { generateMetadata as buildMetadata } from "@/lib/seo/metadata";
import { PublicChallengesListClient } from "./_components/PublicChallengesListClient";

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
      path: `/courses/${courseId}/practice`,
    });
  }

  return buildMetadata({
    title: `Practice — ${course.name} — CodeStreak`,
    description: `Browse every practice challenge for ${course.name}. Attempt anytime, as many times as you like.`,
    path: `/courses/${courseId}/practice`,
  });
}

export default async function PublicPracticePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { course } = await getPublicCourse(courseId);
  if (!course) notFound();

  const result = await listPublicPracticeChallengesPage(courseId);

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
          Practice
        </h1>
        <p className="text-text-muted text-sm">
          Attempt any challenge anytime, as many times as you like.
        </p>
      </div>

      <PublicChallengesListClient
        courseId={courseId}
        initialItems={result.success ? result.items : []}
        initialCursor={result.success ? result.nextCursor : INITIAL_PRACTICE_CURSOR}
        initialHasMore={result.success ? result.hasMore : false}
      />
    </div>
  );
}
