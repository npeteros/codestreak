import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";

export class Enrollment extends Model<InferAttributes<Enrollment>, InferCreationAttributes<Enrollment>> {
  declare courseId: string;
  declare studentId: string;
  declare joinedAt: CreationOptional<Date>;
}

Enrollment.init(
  {
    courseId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: "course_id" },
    studentId: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true, field: "student_id" },
    joinedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "joined_at" },
  },
  {
    sequelize,
    tableName: "enrollments",
    createdAt: false,
    updatedAt: false,
    indexes: [{ fields: ["student_id", "course_id"] }],
  }
);
