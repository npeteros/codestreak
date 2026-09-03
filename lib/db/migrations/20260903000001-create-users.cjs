"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: { type: Sequelize.CHAR(36), primaryKey: true },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.ENUM("INSTRUCTOR", "STUDENT"), allowNull: false },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      deleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("users");
  },
};
