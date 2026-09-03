"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sprint_tasks", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "projects", key: "id" },
        onDelete: "CASCADE",
      },
      student_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      due_date: { type: Sequelize.DATE, allowNull: true },
      status: { type: Sequelize.ENUM("TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"), allowNull: false, defaultValue: "TODO" },
      // DECIMAL, not FLOAT — avoids fractional-index collisions over time.
      order: { type: Sequelize.DECIMAL(20, 10), allowNull: false },
      created_by: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      created_by_role: { type: Sequelize.ENUM("INSTRUCTOR", "STUDENT"), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("sprint_tasks", ["project_id", "student_id", "status", "order"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("sprint_tasks");
  },
};
