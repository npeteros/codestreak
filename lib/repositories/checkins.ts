import { Op } from "sequelize";
import { CheckIn } from "@/lib/db/models";
import type { CheckInDoc } from "@/lib/types";

function toDoc(row: CheckIn): CheckInDoc {
  return { note: row.note, courseId: row.courseId, createdAt: row.createdAt };
}

export async function hasCheckedInInRange(
  studentId: string,
  courseId: string,
  startOfDay: Date,
  endOfDay: Date
): Promise<boolean> {
  const row = await CheckIn.findOne({
    where: { studentId, courseId, createdAt: { [Op.gte]: startOfDay, [Op.lt]: endOfDay } },
  });
  return row !== null;
}

export async function createCheckIn(
  studentId: string,
  courseId: string,
  note: string
): Promise<string> {
  const row = await CheckIn.create({ studentId, courseId, note });
  return row.id;
}

export async function countCheckInsSince(
  studentId: string,
  courseId: string,
  since: Date
): Promise<number> {
  return CheckIn.count({ where: { studentId, courseId, createdAt: { [Op.gte]: since } } });
}

export async function listRecentCheckIns(
  studentId: string,
  courseId: string,
  limit: number
): Promise<Array<{ id: string; data: CheckInDoc }>> {
  const rows = await CheckIn.findAll({
    where: { studentId, courseId },
    order: [["createdAt", "DESC"]],
    limit,
  });
  return rows.map((row) => ({ id: row.id, data: toDoc(row) }));
}

export async function countCheckIns(studentId: string, courseId: string): Promise<number> {
  return CheckIn.count({ where: { studentId, courseId } });
}

export async function listCheckInsPage(
  studentId: string,
  courseId: string,
  limit: number,
  cursor: Date | null
): Promise<Array<{ id: string; data: CheckInDoc }>> {
  const rows = await CheckIn.findAll({
    where: {
      studentId,
      courseId,
      ...(cursor ? { createdAt: { [Op.lt]: cursor } } : {}),
    },
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    limit,
  });
  return rows.map((row) => ({ id: row.id, data: toDoc(row) }));
}
