"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("enrollments", {
      course_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: "courses", key: "id" },
        onDelete: "CASCADE",
      },
      student_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      joined_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("enrollments", ["student_id", "course_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("enrollments");
  },
};
