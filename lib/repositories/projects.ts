import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { ProjectDoc, ProjectScope, SprintTaskDoc, SprintTaskStatus, UserRole } from "@/lib/firebase/types";

function projectsCol(courseId: string) {
  return adminDb.collection("courses").doc(courseId).collection("projects");
}

function tasksCol(courseId: string, projectId: string) {
  return projectsCol(courseId).doc(projectId).collection("tasks");
}

export async function getProject(
  courseId: string,
  projectId: string
): Promise<ProjectDoc | null> {
  const snap = await projectsCol(courseId).doc(projectId).get();
  return snap.exists ? (snap.data() as ProjectDoc) : null;
}

export async function listProjects(
  courseId: string
): Promise<Array<{ id: string; data: ProjectDoc }>> {
  const snap = await projectsCol(courseId).get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as ProjectDoc }));
}

export async function createProject(
  courseId: string,
  data: {
    name: string;
    description?: string;
    scope: ProjectScope;
    studentIds?: string[];
    createdBy: string;
  }
): Promise<string> {
  const ref = await projectsCol(courseId).add({
    courseId,
    name: data.name,
    description: data.description ?? "",
    scope: data.scope,
    studentIds: data.scope === "STUDENTS" ? data.studentIds : [],
    isArchived: false,
    createdBy: data.createdBy,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
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
): Promise<void> {
  await projectsCol(courseId).doc(projectId).update({
    name: data.name,
    description: data.description ?? "",
    scope: data.scope,
    studentIds: data.scope === "STUDENTS" ? data.studentIds : [],
  });
}

export async function setProjectArchived(
  courseId: string,
  projectId: string,
  isArchived: boolean
): Promise<void> {
  await projectsCol(courseId).doc(projectId).update({ isArchived });
}

export async function listAllTasks(
  courseId: string,
  projectId: string
): Promise<Array<{ id: string; data: SprintTaskDoc }>> {
  const snap = await tasksCol(courseId, projectId).get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as SprintTaskDoc }));
}

export async function getTask(
  courseId: string,
  projectId: string,
  taskId: string
): Promise<SprintTaskDoc | null> {
  const snap = await tasksCol(courseId, projectId).doc(taskId).get();
  return snap.exists ? (snap.data() as SprintTaskDoc) : null;
}

export async function createTask(
  courseId: string,
  projectId: string,
  data: {
    title: string;
    description: string;
    dueDate: Date | null;
    order: number;
    createdBy: string;
    createdByRole: UserRole;
  }
): Promise<string> {
  const now = FieldValue.serverTimestamp();
  const ref = await tasksCol(courseId, projectId).add({
    title: data.title,
    description: data.description,
    dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
    status: "TODO" as SprintTaskStatus,
    order: data.order,
    createdBy: data.createdBy,
    createdByRole: data.createdByRole,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateTask(
  courseId: string,
  projectId: string,
  taskId: string,
  update: Record<string, unknown>
): Promise<void> {
  await tasksCol(courseId, projectId)
    .doc(taskId)
    .update({ ...update, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteTask(
  courseId: string,
  projectId: string,
  taskId: string
): Promise<void> {
  await tasksCol(courseId, projectId).doc(taskId).delete();
}

export async function moveTask(
  courseId: string,
  projectId: string,
  taskId: string,
  status: SprintTaskStatus,
  order: number
): Promise<void> {
  await tasksCol(courseId, projectId).doc(taskId).update({
    status,
    order,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
