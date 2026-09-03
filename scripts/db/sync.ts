/**
 * Dev-only schema sync — alters tables in place to match the current model
 * definitions. This bypasses lib/db/migrations/ (sequelize-cli), so it is
 * NOT safe for staging/production: use `npm run db:migrate` there instead.
 *
 * Usage:
 *   npm run db:sync
 */

import {
  sequelize,
  User,
  Course,
  Enrollment,
  Challenge,
  ChallengeSubmission,
  ChallengeAttempt,
  CheckIn,
  JournalEntry,
  SprintCard,
  Project,
  ProjectStudentAccess,
  SprintTask,
  StreakEntry,
} from "../../lib/db/models";

(async () => {
  await User.sync({ alter: true });
  await Course.sync({ alter: true });
  await Enrollment.sync({ alter: true });
  await Challenge.sync({ alter: true });
  await ChallengeSubmission.sync({ alter: true });
  await ChallengeAttempt.sync({ alter: true });
  await CheckIn.sync({ alter: true });
  await JournalEntry.sync({ alter: true });
  await SprintCard.sync({ alter: true });
  await Project.sync({ alter: true });
  await ProjectStudentAccess.sync({ alter: true });
  await SprintTask.sync({ alter: true });
  await StreakEntry.sync({ alter: true });
  console.log("Database synced.");

  console.log(Course.associations);

  await sequelize.close();
})();
