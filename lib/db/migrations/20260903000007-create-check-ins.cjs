"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("check_ins", {
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
      note: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("check_ins", ["student_id", "course_id", "created_at", "id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("check_ins");
  },
};
