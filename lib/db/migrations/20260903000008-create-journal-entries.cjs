"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("journal_entries", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      student_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      course_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "courses", key: "id" },
        onDelete: "CASCADE",
      },
      content: { type: Sequelize.TEXT, allowNull: false },
      trigger_type: { type: Sequelize.ENUM("CHALLENGE", "CHECKIN", "SPRINT_CARD"), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("journal_entries", ["student_id", "course_id", "created_at", "id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("journal_entries");
  },
};
