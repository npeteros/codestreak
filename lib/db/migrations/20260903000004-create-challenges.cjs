"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("challenges", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      course_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "courses", key: "id" },
        onDelete: "CASCADE",
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      difficulty: { type: Sequelize.ENUM("EASY", "MEDIUM", "HARD"), allowNull: false },
      topic_tag: { type: Sequelize.STRING(64), allowNull: false },
      starter_code: { type: Sequelize.TEXT, allowNull: false },
      scheduled_for: { type: Sequelize.DATE, allowNull: true },
      // NOT NULL, no default — see lib/db/models/Challenge.ts for why.
      kind: { type: Sequelize.ENUM("DAILY", "PRACTICE"), allowNull: false },
      is_ai_generated: { type: Sequelize.BOOLEAN, allowNull: false },
      is_draft: { type: Sequelize.BOOLEAN, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("challenges", ["course_id", "kind", "is_draft", "scheduled_for", "id"]);
    await queryInterface.addIndex("challenges", ["course_id", "kind", "created_at", "id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("challenges");
  },
};
