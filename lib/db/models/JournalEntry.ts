import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";
import type { JournalTriggerType } from "@/lib/types";

export class JournalEntry extends Model<InferAttributes<JournalEntry>, InferCreationAttributes<JournalEntry>> {
  declare id: CreationOptional<string>;
  declare studentId: string;
  declare courseId: string;
  declare content: string;
  declare triggerType: JournalTriggerType;
  declare createdAt: CreationOptional<Date>;
}

JournalEntry.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentId: { type: DataTypes.CHAR(36), allowNull: false, field: "student_id" },
    courseId: { type: DataTypes.UUID, allowNull: false, field: "course_id" },
    content: { type: DataTypes.TEXT, allowNull: false },
    triggerType: { type: DataTypes.ENUM("CHALLENGE", "CHECKIN", "SPRINT_CARD"), allowNull: false, field: "trigger_type" },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
  },
  {
    sequelize,
    tableName: "journal_entries",
    updatedAt: false,
    indexes: [{ fields: ["student_id", "course_id", "created_at", "id"] }],
  }
);
