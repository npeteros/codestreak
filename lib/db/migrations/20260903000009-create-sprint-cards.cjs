"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sprint_cards", {
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
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.ENUM("TODO", "IN_PROGRESS", "DONE"), allowNull: false },
      is_instructor_seeded: { type: Sequelize.BOOLEAN, allowNull: false },
      // Nullable, unconstrained — dead Milestone model, not ported.
      milestone_id: { type: Sequelize.CHAR(36), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      moved_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("sprint_cards", ["student_id", "course_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("sprint_cards");
  },
};
