import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";
import type { SprintCardStatus } from "@/lib/types";

// Legacy, read-only from the app — only scripts/seed.ts writes to this
// table. Distinct from Project/SprintTask — don't merge the two.
export class SprintCard extends Model<InferAttributes<SprintCard>, InferCreationAttributes<SprintCard>> {
  declare id: CreationOptional<string>;
  declare studentId: string;
  declare courseId: string;
  declare title: string;
  declare description: string;
  declare status: SprintCardStatus;
  declare isInstructorSeeded: boolean;
  declare milestoneId: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare movedAt: Date;
}

SprintCard.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentId: { type: DataTypes.CHAR(36), allowNull: false, field: "student_id" },
    courseId: { type: DataTypes.UUID, allowNull: false, field: "course_id" },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM("TODO", "IN_PROGRESS", "DONE"), allowNull: false },
    isInstructorSeeded: { type: DataTypes.BOOLEAN, allowNull: false, field: "is_instructor_seeded" },
    // Nullable, unconstrained (no FK) — references the dead Milestone model, not ported.
    milestoneId: { type: DataTypes.CHAR(36), allowNull: true, field: "milestone_id" },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "updated_at" },
    movedAt: { type: DataTypes.DATE, allowNull: false, field: "moved_at" },
  },
  {
    sequelize,
    tableName: "sprint_cards",
    indexes: [{ fields: ["student_id", "course_id"] }],
  }
);
