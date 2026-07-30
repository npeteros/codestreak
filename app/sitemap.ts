import type { MetadataRoute } from "next";
import { listPublicCourses, listPublicPracticeChallengesPage } from "@/lib/actions/publicCatalog";
import { INITIAL_PRACTICE_CURSOR } from "@/lib/domain/practiceMerge";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://codestreak-app.vercel.app";

// Bounds per-course challenge entries so sitemap generation stays cheap.
// Revisit with a sitemap index (multiple sitemap files) if a course's
// browsable-challenge count grows large enough to threaten this.
const MAX_CHALLENGES_PER_COURSE = 200;

async function publicCourseEntries(): Promise<MetadataRoute.Sitemap> {
  const { courses } = await listPublicCourses();
  const entries: MetadataRoute.Sitemap = [];

  for (const course of courses) {
    entries.push(
      { url: `${APP_URL}/courses/${course.id}`, changeFrequency: "weekly", priority: 0.8 },
      { url: `${APP_URL}/courses/${course.id}/challenge`, changeFrequency: "daily", priority: 0.5 },
      { url: `${APP_URL}/courses/${course.id}/practice`, changeFrequency: "weekly", priority: 0.6 }
    );

    let cursor = INITIAL_PRACTICE_CURSOR;
    let hasMore = true;
    let collected = 0;
    while (hasMore && collected < MAX_CHALLENGES_PER_COURSE) {
      const page = await listPublicPracticeChallengesPage(course.id, { cursor });
      if (!page.success) break;
      for (const item of page.items) {
        entries.push({
          url: `${APP_URL}/courses/${course.id}/practice/${item.id}`,
          changeFrequency: "monthly",
          priority: 0.4,
        });
      }
      collected += page.items.length;
      hasMore = page.hasMore;
      cursor = page.nextCursor;
    }
  }

  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicEntries = await publicCourseEntries();

  return [
    {
      url: `${APP_URL}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${APP_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${APP_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    ...publicEntries,
  ];
}
