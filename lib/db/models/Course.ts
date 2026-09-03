import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";

export class Course extends Model<InferAttributes<Course>, InferCreationAttributes<Course>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare description: string;
  declare languageTag: string;
  declare timezone: string;
  declare inviteCode: string;
  declare instructorId: string;
  declare streakRuleChallenge: CreationOptional<boolean>;
  declare streakRuleCheckin: CreationOptional<boolean>;
  declare streakRuleSprintCard: CreationOptional<boolean>;
  declare streakRulePractice: CreationOptional<boolean>;
  declare isArchived: CreationOptional<boolean>;
  declare isPublic: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

Course.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    languageTag: { type: DataTypes.STRING(35), allowNull: false, field: "language_tag" },
    timezone: { type: DataTypes.STRING(64), allowNull: false },
    inviteCode: { type: DataTypes.STRING(16), allowNull: false, unique: true, field: "invite_code" },
    instructorId: { type: DataTypes.CHAR(36), allowNull: false, field: "instructor_id" },
    streakRuleChallenge: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "streak_rule_challenge" },
    streakRuleCheckin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "streak_rule_checkin" },
    streakRuleSprintCard: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "streak_rule_sprint_card" },
    streakRulePractice: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "streak_rule_practice" },
    isArchived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "is_archived" },
    isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "is_public" },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
  },
  {
    sequelize,
    tableName: "courses",
    updatedAt: false,
    indexes: [
      { fields: ["instructor_id", "created_at"] },
      { fields: ["is_public", "is_archived"] },
    ],
  }
);
