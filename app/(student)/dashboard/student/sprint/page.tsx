import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getSprintCards } from "@/lib/actions/sprint";
import { SprintClient } from "./SprintClient";

const COOKIE_NAME = "codestreak_session";

export default async function StudentSprintPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session?.value) redirect("/login");

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    uid = decoded.uid;
  } catch {
    redirect("/login");
  }

  const { courseId: queryCourseId } = await searchParams;
  const hubSnap = await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .get();

  const courseIds = hubSnap.docs
    .map((doc) => doc.data().courseId as string)
    .filter(Boolean);
  const validIds = new Set(courseIds);
  const courseId =
    queryCourseId && validIds.has(queryCourseId)
      ? queryCourseId
      : (courseIds[0] ?? "");

  if (!courseId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
          Sprint Board
        </h1>
        <p className="text-text-muted text-sm">
          You&apos;re not enrolled in any courses yet.
        </p>
      </div>
    );
  }

  const result = await getSprintCards(courseId);
  const cards = result.success ? result.cards : [];

  return <SprintClient courseId={courseId} initialCards={cards} />;
}
