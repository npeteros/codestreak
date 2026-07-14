"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type {
  UserRole,
  CourseDoc,
  ProjectDoc,
  ProjectScope,
  SprintTaskDoc,
  SprintTaskStatus,
} from "@/lib/firebase/types";
import { recordStreakActivity } from "@/lib/actions/streak";
import { triggerJournalEntry } from "@/lib/actions/journal";
import { getUid, getCurrentUser } from "@/lib/auth/session";

export type Project = {
  id: string;
  name: string;
  description: string;
  scope: ProjectScope;
  studentIds: string[];
  isArchived: boolean;
};

export type SprintTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null; // YYYY-MM-DD
  status: SprintTaskStatus;
  order: number;
  createdBy: string;
  createdByRole: UserRole;
};

// ── Session / role helpers ──────────────────────────────────────────────────

async function getCourseForInstructor(
  uid: string,
  courseId: string
): Promise<CourseDoc | null> {
  const snap = await adminDb.collection("courses").doc(courseId).get();
  if (!snap.exists) return null;
  const data = snap.data() as CourseDoc;
  if (data.instructorId !== uid) return null;
  return data;
}

async function isEnrolled(courseId: string, studentId: string): Promise<boolean> {
  const snap = await adminDb
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .doc(studentId)
    .get();
  return snap.exists;
}

function projectsCol(courseId: string) {
  return adminDb.collection("courses").doc(courseId).collection("projects");
}

function tasksCol(courseId: string, projectId: string) {
  return projectsCol(courseId).doc(projectId).collection("tasks");
}

async function verifyProjectAccess(
  courseId: string,
  projectId: string
): Promise<
  | { ok: true; uid: string; role: UserRole; project: ProjectDoc }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  const { uid, role } = user;

  const projSnap = await projectsCol(courseId).doc(projectId).get();
  if (!projSnap.exists) return { ok: false, error: "not_found" };
  const project = projSnap.data() as ProjectDoc;

  if (role === "INSTRUCTOR") {
    const course = await getCourseForInstructor(uid, courseId);
    if (!course) return { ok: false, error: "forbidden" };
    return { ok: true, uid, role, project };
  }

  if (!(await isEnrolled(courseId, uid))) return { ok: false, error: "forbidden" };
  const hasAccess =
    project.scope === "ALL_STUDENTS" ||
    (project.scope === "STUDENTS" && (project.studentIds ?? []).includes(uid));
  if (!hasAccess) return { ok: false, error: "forbidden" };
  return { ok: true, uid, role, project };
}

// ── Serialization ─────────────────────────────────────────────────────────

function serializeProject(id: string, d: ProjectDoc): Project {
  return {
    id,
    name: d.name,
    description: d.description ?? "",
    scope: d.scope,
    studentIds: d.studentIds ?? [],
    isArchived: d.isArchived,
  };
}

function serializeTask(id: string, d: SprintTaskDoc): SprintTask {
  return {
    id,
    title: d.title,
    description: d.description,
    dueDate: d.dueDate ? d.dueDate.toDate().toISOString().slice(0, 10) : null,
    status: d.status,
    order: d.order,
    createdBy: d.createdBy,
    createdByRole: d.createdByRole,
  };
}

// ── Projects ─────────────────────────────────────────────────────────────

export async function createProject(
  courseId: string,
  data: {
    name: string;
    description?: string;
    scope: ProjectScope;
    studentIds?: string[];
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };
  if ((await getCurrentUser())?.role !== "INSTRUCTOR")
    return { success: false, error: "forbidden" };

  const course = await getCourseForInstructor(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  if (data.scope === "STUDENTS") {
    if (!data.studentIds || data.studentIds.length === 0)
      return { success: false, error: "student_required" };
    const enrolled = await Promise.all(
      data.studentIds.map((sid) => isEnrolled(courseId, sid))
    );
    if (enrolled.some((ok) => !ok)) return { success: false, error: "not_enrolled" };
  }

  const ref = await projectsCol(courseId).add({
    courseId,
    name: data.name,
    description: data.description ?? "",
    scope: data.scope,
    studentIds: data.scope === "STUDENTS" ? data.studentIds : [],
    isArchived: false,
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, id: ref.id };
}

export async function updateProject(
  courseId: string,
  projectId: string,
  data: {
    name: string;
    description?: string;
    scope: ProjectScope;
    studentIds?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };
  if ((await getCurrentUser())?.role !== "INSTRUCTOR")
    return { success: false, error: "forbidden" };

  const course = await getCourseForInstructor(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const ref = projectsCol(courseId).doc(projectId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "not_found" };

  if (data.scope === "STUDENTS") {
    if (!data.studentIds || data.studentIds.length === 0)
      return { success: false, error: "student_required" };
    const enrolled = await Promise.all(
      data.studentIds.map((sid) => isEnrolled(courseId, sid))
    );
    if (enrolled.some((ok) => !ok)) return { success: false, error: "not_enrolled" };
  }

  await ref.update({
    name: data.name,
    description: data.description ?? "",
    scope: data.scope,
    studentIds: data.scope === "STUDENTS" ? data.studentIds : [],
  });

  return { success: true };
}

export async function listProjectsForInstructor(
  courseId: string
): Promise<{ success: true; projects: Project[] } | { success: false; error: string }> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };
  const course = await getCourseForInstructor(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const snap = await projectsCol(courseId).get();
  const projects = snap.docs
    .map((d) => serializeProject(d.id, d.data() as ProjectDoc))
    .filter((p) => !p.isArchived)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { success: true, projects };
}

export async function listProjectsForStudent(
  courseId: string
): Promise<{ success: true; projects: Project[] } | { success: false; error: string }> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };
  if ((await getCurrentUser())?.role !== "STUDENT")
    return { success: false, error: "forbidden" };
  if (!(await isEnrolled(courseId, uid))) return { success: false, error: "forbidden" };

  const snap = await projectsCol(courseId).get();
  const projects = snap.docs
    .map((d) => serializeProject(d.id, d.data() as ProjectDoc))
    .filter(
      (p) => !p.isArchived && (p.scope === "ALL_STUDENTS" || p.studentIds.includes(uid))
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return { success: true, projects };
}

export async function toggleProjectArchive(
  courseId: string,
  projectId: string
): Promise<{ success: boolean; isArchived?: boolean; error?: string }> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };
  const course = await getCourseForInstructor(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const ref = projectsCol(courseId).doc(projectId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "not_found" };

  const current = (snap.data() as ProjectDoc).isArchived;
  await ref.update({ isArchived: !current });
  return { success: true, isArchived: !current };
}

// ── Sprint Tasks ─────────────────────────────────────────────────────────

async function getAllTasks(
  courseId: string,
  projectId: string
): Promise<Array<{ id: string; data: SprintTaskDoc }>> {
  const snap = await tasksCol(courseId, projectId).get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as SprintTaskDoc }));
}

export async function getSprintTasks(
  courseId: string,
  projectId: string
): Promise<{ success: true; tasks: SprintTask[] } | { success: false; error: string }> {
  const access = await verifyProjectAccess(courseId, projectId);
  if (!access.ok) return { success: false, error: access.error };

  const all = await getAllTasks(courseId, projectId);
  const tasks = all
    .map(({ id, data }) => serializeTask(id, data))
    .sort((a, b) => a.order - b.order);
  return { success: true, tasks };
}

export async function createSprintTask(
  courseId: string,
  projectId: string,
  data: { title: string; description?: string; dueDate?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const access = await verifyProjectAccess(courseId, projectId);
  if (!access.ok) return { success: false, error: access.error };

  const all = await getAllTasks(courseId, projectId);
  const inTodo = all.filter((t) => t.data.status === "TODO");
  const order = inTodo.length
    ? Math.max(...inTodo.map((t) => t.data.order)) + 1000
    : 1000;

  const now = FieldValue.serverTimestamp();
  const ref = await tasksCol(courseId, projectId).add({
    title: data.title,
    description: data.description ?? "",
    dueDate: data.dueDate
      ? Timestamp.fromDate(new Date(data.dueDate + "T12:00:00Z"))
      : null,
    status: "TODO" as SprintTaskStatus,
    order,
    createdBy: access.uid,
    createdByRole: access.role,
    createdAt: now,
    updatedAt: now,
  });

  return { success: true, id: ref.id };
}

export async function updateSprintTask(
  courseId: string,
  projectId: string,
  taskId: string,
  data: { title?: string; description?: string; dueDate?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const access = await verifyProjectAccess(courseId, projectId);
  if (!access.ok) return { success: false, error: access.error };

  const ref = tasksCol(courseId, projectId).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "not_found" };
  const task = snap.data() as SprintTaskDoc;

  const canManage = access.role === "INSTRUCTOR" || task.createdBy === access.uid;
  if (!canManage) return { success: false, error: "forbidden" };

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.dueDate !== undefined) {
    update.dueDate = data.dueDate
      ? Timestamp.fromDate(new Date(data.dueDate + "T12:00:00Z"))
      : null;
  }

  await ref.update(update);
  return { success: true };
}

export async function deleteSprintTask(
  courseId: string,
  projectId: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  const access = await verifyProjectAccess(courseId, projectId);
  if (!access.ok) return { success: false, error: access.error };

  const ref = tasksCol(courseId, projectId).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "not_found" };
  const task = snap.data() as SprintTaskDoc;

  const canManage = access.role === "INSTRUCTOR" || task.createdBy === access.uid;
  if (!canManage) return { success: false, error: "forbidden" };

  await ref.delete();
  return { success: true };
}

export async function moveSprintTask(
  courseId: string,
  projectId: string,
  taskId: string,
  data: { status: SprintTaskStatus; insertBeforeId?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const access = await verifyProjectAccess(courseId, projectId);
  if (!access.ok) return { success: false, error: access.error };

  const ref = tasksCol(courseId, projectId).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "not_found" };
  const task = snap.data() as SprintTaskDoc;

  const all = await getAllTasks(courseId, projectId);
  const destCol = all
    .filter((t) => t.id !== taskId && t.data.status === data.status)
    .sort((a, b) => a.data.order - b.data.order);

  let order: number;
  const insertIdx = data.insertBeforeId
    ? destCol.findIndex((t) => t.id === data.insertBeforeId)
    : -1;
  if (insertIdx === -1) {
    order = destCol.length
      ? destCol[destCol.length - 1].data.order + 1000
      : 1000;
  } else {
    const before = insertIdx > 0 ? destCol[insertIdx - 1].data.order : 0;
    const after = destCol[insertIdx].data.order;
    order = (before + after) / 2;
  }

  await ref.update({
    status: data.status,
    order,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const justCompleted = data.status === "DONE" && task.status !== "DONE";
  if (justCompleted && access.role === "STUDENT") {
    recordStreakActivity({ studentId: access.uid, courseId, source: "sprintCard" }).catch(
      (err) => console.error("[projects] recordStreakActivity failed:", err)
    );
    triggerJournalEntry(access.uid, courseId, {
      triggerType: "SPRINT_CARD",
      taskTitle: task.title,
      projectName: access.project.name,
    }).catch((err) =>
      console.error("[projects] triggerJournalEntry failed:", err)
    );
  }

  return { success: true };
}
