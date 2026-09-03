// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS config file for sequelize-cli's own Node loader.
require("dotenv").config();

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  dialect: "mysql",
};

module.exports = {
  development: base,
  test: { ...base, database: process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test` },
  production: base,
};
