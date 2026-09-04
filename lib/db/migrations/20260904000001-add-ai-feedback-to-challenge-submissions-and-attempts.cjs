"use strict";

const TABLES = ["challenge_submissions", "challenge_attempts"];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of TABLES) {
      await queryInterface.addColumn(table, "ai_verdict", {
        type: Sequelize.ENUM("CORRECT", "PARTIALLY_CORRECT", "INCORRECT", "UNABLE_TO_ASSESS"),
        allowNull: true,
      });
      await queryInterface.addColumn(table, "ai_celebrate", { type: Sequelize.TEXT, allowNull: true });
      await queryInterface.addColumn(table, "ai_improve", { type: Sequelize.TEXT, allowNull: true });
      await queryInterface.addColumn(table, "ai_feedback_at", { type: Sequelize.DATE, allowNull: true });
    }
  },
  async down(queryInterface) {
    for (const table of TABLES) {
      await queryInterface.removeColumn(table, "ai_verdict");
      await queryInterface.removeColumn(table, "ai_celebrate");
      await queryInterface.removeColumn(table, "ai_improve");
      await queryInterface.removeColumn(table, "ai_feedback_at");
    }
  },
};
