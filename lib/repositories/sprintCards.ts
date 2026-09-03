import { SprintCard } from "@/lib/db/models";
import type { SprintCardDoc } from "@/lib/types";

// Legacy, read-only from the app — distinct from the live Project/SprintTask boards.
export async function listSprintCards(
  studentId: string,
  courseId: string
): Promise<SprintCardDoc[]> {
  const rows = await SprintCard.findAll({ where: { studentId, courseId } });
  return rows.map((row) => ({
    title: row.title,
    description: row.description,
    status: row.status,
    isInstructorSeeded: row.isInstructorSeeded,
    milestoneId: row.milestoneId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    movedAt: row.movedAt,
  }));
}
