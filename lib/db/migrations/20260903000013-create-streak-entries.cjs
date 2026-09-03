"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("streak_entries", {
      student_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      course_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: "courses", key: "id" },
        onDelete: "CASCADE",
      },
      date: { type: Sequelize.CHAR(10), allowNull: false, primaryKey: true },
      challenge: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      checkin: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      sprint_card: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      practice: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("streak_entries");
  },
};
