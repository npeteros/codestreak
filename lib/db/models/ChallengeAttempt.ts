import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";
import type { SubmissionVerdict } from "@/lib/types";

export class ChallengeAttempt extends Model<InferAttributes<ChallengeAttempt>, InferCreationAttributes<ChallengeAttempt>> {
  declare id: CreationOptional<string>;
  declare studentId: string;
  declare courseId: string;
  declare challengeId: string;
  declare code: string;
  declare submittedAt: CreationOptional<Date>;
  declare aiVerdict: SubmissionVerdict | null;
  declare aiCelebrate: string | null;
  declare aiImprove: string | null;
  declare aiFeedbackAt: Date | null;
}

ChallengeAttempt.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentId: { type: DataTypes.CHAR(36), allowNull: false, field: "student_id" },
    courseId: { type: DataTypes.UUID, allowNull: false, field: "course_id" },
    challengeId: { type: DataTypes.UUID, allowNull: false, field: "challenge_id" },
    code: { type: DataTypes.TEXT, allowNull: false },
    submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "submitted_at" },
    aiVerdict: {
      type: DataTypes.ENUM("CORRECT", "PARTIALLY_CORRECT", "INCORRECT", "UNABLE_TO_ASSESS"),
      allowNull: true,
      field: "ai_verdict",
    },
    aiCelebrate: { type: DataTypes.TEXT, allowNull: true, field: "ai_celebrate" },
    aiImprove: { type: DataTypes.TEXT, allowNull: true, field: "ai_improve" },
    aiFeedbackAt: { type: DataTypes.DATE, allowNull: true, field: "ai_feedback_at" },
  },
  {
    sequelize,
    tableName: "challenge_attempts",
    createdAt: false,
    updatedAt: false,
    // No unique constraint — unlimited retakes, every attempt is a new row.
    indexes: [{ fields: ["student_id", "course_id", "challenge_id"] }],
  }
);
