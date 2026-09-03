import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";

// Four boolean columns rather than one JSON column: writes touch exactly one
// source at a time, and a flat column supports a single atomic
// `INSERT ... ON DUPLICATE KEY UPDATE <source> = ...` — a JSON column would
// force read-modify-write.
export class StreakEntry extends Model<InferAttributes<StreakEntry>, InferCreationAttributes<StreakEntry>> {
  declare studentId: string;
  declare courseId: string;
  declare date: string; // YYYY-MM-DD
  declare challenge: CreationOptional<boolean>;
  declare checkin: CreationOptional<boolean>;
  declare sprintCard: CreationOptional<boolean>;
  declare practice: CreationOptional<boolean>;
}

StreakEntry.init(
  {
    studentId: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true, field: "student_id" },
    courseId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: "course_id" },
    date: { type: DataTypes.CHAR(10), allowNull: false, primaryKey: true },
    challenge: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    checkin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sprintCard: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "sprint_card" },
    practice: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    sequelize,
    tableName: "streak_entries",
    timestamps: false,
  }
);
