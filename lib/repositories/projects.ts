import { sequelize } from "@/lib/db/sequelize";
import { Project, ProjectStudentAccess, SprintTask } from "@/lib/db/models";
import type {
  ProjectDoc,
  ProjectScope,
  SprintTaskDoc,
  SprintTaskStatus,
  UserRole,
} from "@/lib/types";

async function toProjectDoc(row: Project): Promise<ProjectDoc> {
  const studentIds =
    row.scope === "STUDENTS"
      ? (
          await ProjectStudentAccess.findAll({
            where: { projectId: row.id },
            attributes: ["studentId"],
          })
        ).map((r) => r.studentId)
      : undefined;
  return {
    courseId: row.courseId,
    name: row.name,
    description: row.description ?? "",
    scope: row.scope,
    studentIds,
    isArchived: row.isArchived,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export async function getProject(
  courseId: string,
  projectId: string
): Promise<ProjectDoc | null> {
  const row = await Project.findOne({ where: { id: projectId, courseId } });
  return row ? toProjectDoc(row) : null;
}

export async function listProjects(
  courseId: string
): Promise<Array<{ id: string; data: ProjectDoc }>> {
  const rows = await Project.findAll({ where: { courseId } });
  return Promise.all(rows.map(async (row) => ({ id: row.id, data: await toProjectDoc(row) })));
}

// Fully replaces student-access rows rather than diffing, in one transaction.
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
  return sequelize.transaction(async (t) => {
    const row = await Project.create(
      {
        courseId,
        name: data.name,
        description: data.description ?? "",
        scope: data.scope,
        createdBy: data.createdBy,
      },
      { transaction: t }
    );
    if (data.scope === "STUDENTS" && data.studentIds?.length) {
      await ProjectStudentAccess.bulkCreate(
        data.studentIds.map((studentId) => ({ projectId: row.id, studentId })),
        { transaction: t }
      );
    }
    return row.id;
  });
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
  await sequelize.transaction(async (t) => {
    await Project.update(
      { name: data.name, description: data.description ?? "", scope: data.scope },
      { where: { id: projectId, courseId }, transaction: t }
    );
    await ProjectStudentAccess.destroy({ where: { projectId }, transaction: t });
    if (data.scope === "STUDENTS" && data.studentIds?.length) {
      await ProjectStudentAccess.bulkCreate(
        data.studentIds.map((studentId) => ({ projectId, studentId })),
        { transaction: t }
      );
    }
  });
}

export async function setProjectArchived(
  courseId: string,
  projectId: string,
  isArchived: boolean
): Promise<void> {
  await Project.update({ isArchived }, { where: { id: projectId, courseId } });
}

function toTaskDoc(row: SprintTask): SprintTaskDoc {
  return {
    title: row.title,
    description: row.description,
    dueDate: row.dueDate,
    status: row.status,
    order: Number(row.order), // DECIMAL comes back as a string
    createdBy: row.createdBy,
    createdByRole: row.createdByRole,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAllTasks(
  courseId: string,
  projectId: string,
  studentId: string
): Promise<Array<{ id: string; data: SprintTaskDoc }>> {
  const rows = await SprintTask.findAll({ where: { projectId, studentId } });
  return rows.map((row) => ({ id: row.id, data: toTaskDoc(row) }));
}

export async function getTask(
  courseId: string,
  projectId: string,
  studentId: string,
  taskId: string
): Promise<SprintTaskDoc | null> {
  const row = await SprintTask.findOne({ where: { id: taskId, projectId, studentId } });
  return row ? toTaskDoc(row) : null;
}

export async function createTask(
  courseId: string,
  projectId: string,
  studentId: string,
  data: {
    title: string;
    description: string;
    dueDate: Date | null;
    order: number;
    createdBy: string;
    createdByRole: UserRole;
  }
): Promise<string> {
  const row = await SprintTask.create({
    projectId,
    studentId,
    title: data.title,
    description: data.description,
    dueDate: data.dueDate,
    status: "TODO",
    order: String(data.order),
    createdBy: data.createdBy,
    createdByRole: data.createdByRole,
  });
  return row.id;
}

export async function updateTask(
  courseId: string,
  projectId: string,
  studentId: string,
  taskId: string,
  update: Record<string, unknown>
): Promise<void> {
  await SprintTask.update(update, { where: { id: taskId, projectId, studentId } });
}

export async function deleteTask(
  courseId: string,
  projectId: string,
  studentId: string,
  taskId: string
): Promise<void> {
  await SprintTask.destroy({ where: { id: taskId, projectId, studentId } });
}

export async function moveTask(
  courseId: string,
  projectId: string,
  studentId: string,
  taskId: string,
  status: SprintTaskStatus,
  order: number
): Promise<void> {
  await SprintTask.update(
    { status, order: String(order) },
    { where: { id: taskId, projectId, studentId } }
  );
}
