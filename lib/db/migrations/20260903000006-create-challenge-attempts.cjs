"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("challenge_attempts", {
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
      challenge_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "challenges", key: "id" },
        onDelete: "CASCADE",
      },
      code: { type: Sequelize.TEXT, allowNull: false },
      submitted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("challenge_attempts", ["student_id", "course_id", "challenge_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("challenge_attempts");
  },
};
