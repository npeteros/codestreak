import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";
import type { ChallengeDifficulty, ChallengeKind } from "@/lib/types";

export class Challenge extends Model<InferAttributes<Challenge>, InferCreationAttributes<Challenge>> {
  declare id: CreationOptional<string>;
  declare courseId: string;
  declare title: string;
  declare description: string;
  declare difficulty: ChallengeDifficulty;
  declare topicTag: string;
  declare starterCode: string;
  declare scheduledFor: Date | null;
  declare kind: ChallengeKind;
  declare isAiGenerated: boolean;
  declare isDraft: boolean;
  declare createdAt: CreationOptional<Date>;
}

Challenge.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    courseId: { type: DataTypes.UUID, allowNull: false, field: "course_id" },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    difficulty: { type: DataTypes.ENUM("EASY", "MEDIUM", "HARD"), allowNull: false },
    topicTag: { type: DataTypes.STRING(64), allowNull: false, field: "topic_tag" },
    starterCode: { type: DataTypes.TEXT, allowNull: false, field: "starter_code" },
    // PRACTICE challenges leave this null (never day-gated).
    scheduledFor: { type: DataTypes.DATE, allowNull: true, field: "scheduled_for" },
    // No default, deliberately — every write must specify kind explicitly.
    kind: { type: DataTypes.ENUM("DAILY", "PRACTICE"), allowNull: false },
    isAiGenerated: { type: DataTypes.BOOLEAN, allowNull: false, field: "is_ai_generated" },
    isDraft: { type: DataTypes.BOOLEAN, allowNull: false, field: "is_draft" },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
  },
  {
    sequelize,
    tableName: "challenges",
    updatedAt: false,
    indexes: [
      { fields: ["course_id", "kind", "is_draft", "scheduled_for", "id"] },
      { fields: ["course_id", "kind", "created_at", "id"] },
    ],
  }
);
