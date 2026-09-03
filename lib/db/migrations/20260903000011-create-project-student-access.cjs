"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("project_student_access", {
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: "projects", key: "id" },
        onDelete: "CASCADE",
      },
      student_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
    });
    await queryInterface.addIndex("project_student_access", ["student_id", "project_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("project_student_access");
  },
};
