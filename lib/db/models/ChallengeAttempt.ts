import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";

export class ChallengeAttempt extends Model<InferAttributes<ChallengeAttempt>, InferCreationAttributes<ChallengeAttempt>> {
  declare id: CreationOptional<string>;
  declare studentId: string;
  declare courseId: string;
  declare challengeId: string;
  declare code: string;
  declare submittedAt: CreationOptional<Date>;
}

ChallengeAttempt.init(
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
    tableName: "challenge_attempts",
    createdAt: false,
    updatedAt: false,
    // No unique constraint — unlimited retakes, every attempt is a new row.
    indexes: [{ fields: ["student_id", "course_id", "challenge_id"] }],
  }
);
