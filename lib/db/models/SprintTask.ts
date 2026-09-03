import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";
import type { SprintTaskStatus, UserRole } from "@/lib/types";

export class SprintTask extends Model<InferAttributes<SprintTask>, InferCreationAttributes<SprintTask>> {
  declare id: CreationOptional<string>;
  declare projectId: string;
  declare studentId: string;
  declare title: string;
  declare description: string;
  declare dueDate: Date | null;
  declare status: CreationOptional<SprintTaskStatus>;
  declare order: string; // DECIMAL comes back as a string — parse at the repository boundary
  declare createdBy: string;
  declare createdByRole: UserRole;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

SprintTask.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    projectId: { type: DataTypes.UUID, allowNull: false, field: "project_id" },
    studentId: { type: DataTypes.CHAR(36), allowNull: false, field: "student_id" },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    dueDate: { type: DataTypes.DATE, allowNull: true, field: "due_date" },
    status: { type: DataTypes.ENUM("TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"), allowNull: false, defaultValue: "TODO" },
    // DECIMAL, not FLOAT — a float column collides on precision under
    // repeated fractional-index insert-between operations.
    order: { type: DataTypes.DECIMAL(20, 10), allowNull: false },
    createdBy: { type: DataTypes.CHAR(36), allowNull: false, field: "created_by" },
    createdByRole: { type: DataTypes.ENUM("INSTRUCTOR", "STUDENT"), allowNull: false, field: "created_by_role" },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "updated_at" },
  },
  {
    sequelize,
    tableName: "sprint_tasks",
    indexes: [{ fields: ["project_id", "student_id", "status", "order"] }],
  }
);
