import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";

export class ChallengeSubmission extends Model<InferAttributes<ChallengeSubmission>, InferCreationAttributes<ChallengeSubmission>> {
  declare id: CreationOptional<string>;
  declare studentId: string;
  declare courseId: string;
  declare challengeId: string;
  declare code: string;
  declare submittedAt: CreationOptional<Date>;
}

ChallengeSubmission.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentId: { type: DataTypes.CHAR(36), allowNull: false, field: "student_id" },
    courseId: { type: DataTypes.UUID, allowNull: false, field: "course_id" },
    challengeId: { type: DataTypes.UUID, allowNull: false, field: "challenge_id" },
    code: { type: DataTypes.TEXT, allowNull: false },
    submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "submitted_at" },
  },
  {
    sequelize,
    tableName: "challenge_submissions",
    createdAt: false,
    updatedAt: false,
    indexes: [
      // One submission per (student, course, challenge) — lets upsertSubmission be a single atomic UPSERT.
      { unique: true, fields: ["student_id", "course_id", "challenge_id"] },
      { fields: ["student_id", "course_id", "submitted_at", "id"] },
    ],
  }
);
