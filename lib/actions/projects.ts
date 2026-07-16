"use server";

import type { ProjectDoc, ProjectScope, SprintTaskDoc, SprintTaskStatus, UserRole } from "@/lib/firebase/types";
import { recordStreakActivity } from "@/lib/actions/streak";
import { triggerJournalEntry } from "@/lib/actions/journal";
import { notifyProjectCreated, notifyTaskCreated } from "@/lib/actions/notifications";
import { getUid, getCurrentUser } from "@/lib/auth/session";
import { getCourseOwnedByInstructor } from "@/lib/repositories/courses";
import { isEnrolled } from "@/lib/repositories/enrollments";
import * as projectsRepo from "@/lib/repositories/projects";

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

// ── Access helpers ───────────────────────────────────────────────────────────

async function verifyProjectAccess(
  courseId: string,
  projectId: string,
  requestedStudentId?: string
): Promise<
  | { ok: true; uid: string; role: UserRole; project: ProjectDoc; boardStudentId: string }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  const { uid, role } = user;

  const project = await projectsRepo.getProject(courseId, projectId);
  if (!project) return { ok: false, error: "not_found" };

  if (role === "INSTRUCTOR") {
    const course = await getCourseOwnedByInstructor(uid, courseId);
    if (!course) return { ok: false, error: "forbidden" };
    if (!requestedStudentId) return { ok: false, error: "student_required" };
    const isMember =
      project.scope === "ALL_STUDENTS"
        ? await isEnrolled(courseId, requestedStudentId)
        : (project.studentIds ?? []).includes(requestedStudentId);
    if (!isMember) return { ok: false, error: "forbidden" };
    return { ok: true, uid, role, project, boardStudentId: requestedStudentId };
  }

  if (!(await isEnrolled(courseId, uid))) return { ok: false, error: "forbidden" };
  const hasAccess =
    project.scope === "ALL_STUDENTS" ||
    (project.scope === "STUDENTS" && (project.studentIds ?? []).includes(uid));
  if (!hasAccess) return { ok: false, error: "forbidden" };
  return { ok: true, uid, role, project, boardStudentId: uid };
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

  const course = await getCourseOwnedByInstructor(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  if (data.scope === "STUDENTS") {
    if (!data.studentIds || data.studentIds.length === 0)
      return { success: false, error: "student_required" };
    const enrolled = await Promise.all(
      data.studentIds.map((sid) => isEnrolled(courseId, sid))
    );
    if (enrolled.some((ok) => !ok)) return { success: false, error: "not_enrolled" };
  }

  const id = await projectsRepo.createProject(courseId, {
    name: data.name,
    description: data.description,
    scope: data.scope,
    studentIds: data.studentIds,
    createdBy: uid,
  });

  notifyProjectCreated(courseId, id).catch((err) =>
    console.error("[notifications] notifyProjectCreated failed:", err)
  );

  return { success: true, id };
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

  const course = await getCourseOwnedByInstructor(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const project = await projectsRepo.getProject(courseId, projectId);
  if (!project) return { success: false, error: "not_found" };

  if (data.scope === "STUDENTS") {
    if (!data.studentIds || data.studentIds.length === 0)
      return { success: false, error: "student_required" };
    const enrolled = await Promise.all(
      data.studentIds.map((sid) => isEnrolled(courseId, sid))
    );
    if (enrolled.some((ok) => !ok)) return { success: false, error: "not_enrolled" };
  }

  await projectsRepo.updateProject(courseId, projectId, data);

  return { success: true };
}

export async function listProjectsForInstructor(
  courseId: string
): Promise<{ success: true; projects: Project[] } | { success: false; error: string }> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };
  const course = await getCourseOwnedByInstructor(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const all = await projectsRepo.listProjects(courseId);
  const projects = all
    .map(({ id, data }) => serializeProject(id, data))
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

  const all = await projectsRepo.listProjects(courseId);
  const projects = all
    .map(({ id, data }) => serializeProject(id, data))
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
  const course = await getCourseOwnedByInstructor(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const project = await projectsRepo.getProject(courseId, projectId);
  if (!project) return { success: false, error: "not_found" };

  const next = !project.isArchived;
  await projectsRepo.setProjectArchived(courseId, projectId, next);
  return { success: true, isArchived: next };
}

// ── Sprint Tasks ─────────────────────────────────────────────────────────

export async function getSprintTasks(
  courseId: string,
  projectId: string,
  studentId?: string
): Promise<{ success: true; tasks: SprintTask[] } | { success: false; error: string }> {
  const access = await verifyProjectAccess(courseId, projectId, studentId);
  if (!access.ok) return { success: false, error: access.error };

  const all = await projectsRepo.listAllTasks(courseId, projectId, access.boardStudentId);
  const tasks = all
    .map(({ id, data }) => serializeTask(id, data))
    .sort((a, b) => a.order - b.order);
  return { success: true, tasks };
}

export async function createSprintTask(
  courseId: string,
  projectId: string,
  data: { title: string; description?: string; dueDate?: string },
  studentId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const access = await verifyProjectAccess(courseId, projectId, studentId);
  if (!access.ok) return { success: false, error: access.error };

  const all = await projectsRepo.listAllTasks(courseId, projectId, access.boardStudentId);
  const inTodo = all.filter((t) => t.data.status === "TODO");
  const order = inTodo.length
    ? Math.max(...inTodo.map((t) => t.data.order)) + 1000
    : 1000;

  const id = await projectsRepo.createTask(courseId, projectId, access.boardStudentId, {
    title: data.title,
    description: data.description ?? "",
    dueDate: data.dueDate ? new Date(data.dueDate + "T12:00:00Z") : null,
    order,
    createdBy: access.uid,
    createdByRole: access.role,
  });

  // Only cross-person case: an instructor adding a task to a student's board.
  // A student creating their own task shouldn't email themselves.
  if (access.role === "INSTRUCTOR") {
    notifyTaskCreated(courseId, projectId, id, access.boardStudentId).catch((err) =>
      console.error("[notifications] notifyTaskCreated failed:", err)
    );
  }

  return { success: true, id };
}

export async function updateSprintTask(
  courseId: string,
  projectId: string,
  taskId: string,
  data: { title?: string; description?: string; dueDate?: string | null },
  studentId?: string
): Promise<{ success: boolean; error?: string }> {
  const access = await verifyProjectAccess(courseId, projectId, studentId);
  if (!access.ok) return { success: false, error: access.error };

  const task = await projectsRepo.getTask(courseId, projectId, access.boardStudentId, taskId);
  if (!task) return { success: false, error: "not_found" };

  const canManage = access.role === "INSTRUCTOR" || task.createdBy === access.uid;
  if (!canManage) return { success: false, error: "forbidden" };

  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.dueDate !== undefined) {
    update.dueDate = data.dueDate ? new Date(data.dueDate + "T12:00:00Z") : null;
  }

  await projectsRepo.updateTask(courseId, projectId, access.boardStudentId, taskId, update);
  return { success: true };
}

export async function deleteSprintTask(
  courseId: string,
  projectId: string,
  taskId: string,
  studentId?: string
): Promise<{ success: boolean; error?: string }> {
  const access = await verifyProjectAccess(courseId, projectId, studentId);
  if (!access.ok) return { success: false, error: access.error };

  const task = await projectsRepo.getTask(courseId, projectId, access.boardStudentId, taskId);
  if (!task) return { success: false, error: "not_found" };

  const canManage = access.role === "INSTRUCTOR" || task.createdBy === access.uid;
  if (!canManage) return { success: false, error: "forbidden" };

  await projectsRepo.deleteTask(courseId, projectId, access.boardStudentId, taskId);
  return { success: true };
}

export async function moveSprintTask(
  courseId: string,
  projectId: string,
  taskId: string,
  data: { status: SprintTaskStatus; insertBeforeId?: string | null },
  studentId?: string
): Promise<{ success: boolean; error?: string }> {
  const access = await verifyProjectAccess(courseId, projectId, studentId);
  if (!access.ok) return { success: false, error: access.error };

  const task = await projectsRepo.getTask(courseId, projectId, access.boardStudentId, taskId);
  if (!task) return { success: false, error: "not_found" };

  const all = await projectsRepo.listAllTasks(courseId, projectId, access.boardStudentId);
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

  await projectsRepo.moveTask(courseId, projectId, access.boardStudentId, taskId, data.status, order);

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
