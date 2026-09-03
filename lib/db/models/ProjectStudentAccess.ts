import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";

// Replaces ProjectDoc.studentIds (a plain array field, read/written wholesale
// and never queried with array-contains) with a real join table, so "is this
// student on this project" is an indexed query instead of a full-row scan.
export class ProjectStudentAccess extends Model<InferAttributes<ProjectStudentAccess>, InferCreationAttributes<ProjectStudentAccess>> {
  declare projectId: string;
  declare studentId: string;
}

ProjectStudentAccess.init(
  {
    projectId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: "project_id" },
    studentId: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true, field: "student_id" },
  },
  {
    sequelize,
    tableName: "project_student_access",
    timestamps: false,
    indexes: [{ fields: ["student_id", "project_id"] }],
  }
);
