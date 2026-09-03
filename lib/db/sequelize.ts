import { Sequelize } from "sequelize";

declare global {
  var __sequelize: Sequelize | undefined;
}

// Cached on globalThis to avoid re-creating the connection pool on every module reload.
function createSequelize(): Sequelize {
  return new Sequelize(
    process.env.DB_NAME!,
    process.env.DB_USER!,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      dialect: "mysql",
      logging: false,
    }
  );
}

export const sequelize = globalThis.__sequelize ?? createSequelize();

if (process.env.NODE_ENV !== "production") {
  globalThis.__sequelize = sequelize;
}
