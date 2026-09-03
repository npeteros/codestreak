"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("courses", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      language_tag: { type: Sequelize.STRING(35), allowNull: false },
      timezone: { type: Sequelize.STRING(64), allowNull: false },
      invite_code: { type: Sequelize.STRING(16), allowNull: false, unique: true },
      instructor_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      streak_rule_challenge: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      streak_rule_checkin: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      streak_rule_sprint_card: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      streak_rule_practice: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_archived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_public: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex("courses", ["instructor_id", "created_at"]);
    await queryInterface.addIndex("courses", ["is_public", "is_archived"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("courses");
  },
};
