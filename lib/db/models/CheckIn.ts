import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";

export class CheckIn extends Model<InferAttributes<CheckIn>, InferCreationAttributes<CheckIn>> {
  declare id: CreationOptional<string>;
  declare studentId: string;
  declare courseId: string;
  declare note: string;
  declare createdAt: CreationOptional<Date>;
}

CheckIn.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentId: { type: DataTypes.CHAR(36), allowNull: false, field: "student_id" },
    courseId: { type: DataTypes.UUID, allowNull: false, field: "course_id" },
    note: { type: DataTypes.TEXT, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
  },
  {
    sequelize,
    tableName: "check_ins",
    updatedAt: false,
    indexes: [{ fields: ["student_id", "course_id", "created_at", "id"] }],
  }
);
