import { adminDb } from "@/lib/firebase/admin";
import type { SprintCardDoc } from "@/lib/firebase/types";

// /students/{uid}/courses/{courseId}/sprintCards — legacy Kanban snapshot,
// read-only from the app (only scripts/seed.ts writes to it).
export async function listSprintCards(
  studentId: string,
  courseId: string
): Promise<SprintCardDoc[]> {
  const snap = await adminDb
    .collection("students")
    .doc(studentId)
    .collection("courses")
    .doc(courseId)
    .collection("sprintCards")
    .get();
  return snap.docs.map((d) => d.data() as SprintCardDoc);
}
