import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { ChallengesClient } from "@/app/(instructor)/_components/ChallengesClient";

const COOKIE = "codestreak_session";

export default async function InstructorChallengesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE);
  if (!session?.value) redirect("/login");

  try {
    await adminAuth.verifySessionCookie(session.value, true);
  } catch {
    redirect("/login");
  }

  const today = new Date().toISOString().slice(0, 10);

  return <ChallengesClient courseId={courseId} defaultDate={today} />;
}
