import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";
import type { UserRole } from "@/lib/types";

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: string;
  declare email: string;
  declare name: string;
  declare role: UserRole;
  declare passwordHash: string;
  declare deleted: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

User.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM("INSTRUCTOR", "STUDENT"), allowNull: false },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: "password_hash" },
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
  },
  { sequelize, tableName: "users", updatedAt: false }
);
