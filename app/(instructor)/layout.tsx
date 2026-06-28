import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { UserDoc } from "@/lib/firebase/types";

const COOKIE = "codestreak_session";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE);
  if (!session?.value) redirect("/login");

  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists || (userSnap.data() as UserDoc).role !== "INSTRUCTOR") {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }

  return <>{children}</>;
}
