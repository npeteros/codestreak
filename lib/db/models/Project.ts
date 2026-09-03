import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";
import type { ProjectScope } from "@/lib/types";

export class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project>> {
  declare id: CreationOptional<string>;
  declare courseId: string;
  declare name: string;
  declare description: string | null;
  declare scope: ProjectScope;
  declare isArchived: CreationOptional<boolean>;
  declare createdBy: string;
  declare createdAt: CreationOptional<Date>;
}

Project.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    courseId: { type: DataTypes.UUID, allowNull: false, field: "course_id" },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    scope: { type: DataTypes.ENUM("ALL_STUDENTS", "STUDENTS"), allowNull: false },
    isArchived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "is_archived" },
    createdBy: { type: DataTypes.CHAR(36), allowNull: false, field: "created_by" },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
  },
  {
    sequelize,
    tableName: "projects",
    updatedAt: false,
    indexes: [{ fields: ["course_id"] }],
  }
);
