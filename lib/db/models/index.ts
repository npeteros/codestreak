import { sequelize } from "@/lib/db/sequelize";
import { User } from "@/lib/db/models/User";
import { Course } from "@/lib/db/models/Course";
import { Enrollment } from "@/lib/db/models/Enrollment";
import { Challenge } from "@/lib/db/models/Challenge";
import { ChallengeSubmission } from "@/lib/db/models/ChallengeSubmission";
import { ChallengeAttempt } from "@/lib/db/models/ChallengeAttempt";
import { CheckIn } from "@/lib/db/models/CheckIn";
import { JournalEntry } from "@/lib/db/models/JournalEntry";
import { SprintCard } from "@/lib/db/models/SprintCard";
import { Project } from "@/lib/db/models/Project";
import { ProjectStudentAccess } from "@/lib/db/models/ProjectStudentAccess";
import { SprintTask } from "@/lib/db/models/SprintTask";
import { StreakEntry } from "@/lib/db/models/StreakEntry";

// Hard deletes via ON DELETE CASCADE throughout — see docs/ARCHITECTURE.md
// for why these tables don't use soft deletes.

User.hasMany(Course, { foreignKey: "instructorId", onDelete: "CASCADE" });
Course.belongsTo(User, { foreignKey: "instructorId" });

Course.hasMany(Enrollment, { foreignKey: "courseId", onDelete: "CASCADE" });
Enrollment.belongsTo(Course, { foreignKey: "courseId" });
User.hasMany(Enrollment, { foreignKey: "studentId", onDelete: "CASCADE" });
Enrollment.belongsTo(User, { foreignKey: "studentId" });

Course.hasMany(Challenge, { foreignKey: "courseId", onDelete: "CASCADE" });
Challenge.belongsTo(Course, { foreignKey: "courseId" });

Course.hasMany(ChallengeSubmission, { foreignKey: "courseId", onDelete: "CASCADE" });
ChallengeSubmission.belongsTo(Course, { foreignKey: "courseId" });
User.hasMany(ChallengeSubmission, { foreignKey: "studentId", onDelete: "CASCADE" });
ChallengeSubmission.belongsTo(User, { foreignKey: "studentId" });
Challenge.hasMany(ChallengeSubmission, { foreignKey: "challengeId", onDelete: "CASCADE" });
ChallengeSubmission.belongsTo(Challenge, { foreignKey: "challengeId" });

Course.hasMany(ChallengeAttempt, { foreignKey: "courseId", onDelete: "CASCADE" });
ChallengeAttempt.belongsTo(Course, { foreignKey: "courseId" });
User.hasMany(ChallengeAttempt, { foreignKey: "studentId", onDelete: "CASCADE" });
ChallengeAttempt.belongsTo(User, { foreignKey: "studentId" });
Challenge.hasMany(ChallengeAttempt, { foreignKey: "challengeId", onDelete: "CASCADE" });
ChallengeAttempt.belongsTo(Challenge, { foreignKey: "challengeId" });

Course.hasMany(CheckIn, { foreignKey: "courseId", onDelete: "CASCADE" });
CheckIn.belongsTo(Course, { foreignKey: "courseId" });
User.hasMany(CheckIn, { foreignKey: "studentId", onDelete: "CASCADE" });
CheckIn.belongsTo(User, { foreignKey: "studentId" });

Course.hasMany(JournalEntry, { foreignKey: "courseId", onDelete: "CASCADE" });
JournalEntry.belongsTo(Course, { foreignKey: "courseId" });
User.hasMany(JournalEntry, { foreignKey: "studentId", onDelete: "CASCADE" });
JournalEntry.belongsTo(User, { foreignKey: "studentId" });

Course.hasMany(SprintCard, { foreignKey: "courseId", onDelete: "CASCADE" });
SprintCard.belongsTo(Course, { foreignKey: "courseId" });
User.hasMany(SprintCard, { foreignKey: "studentId", onDelete: "CASCADE" });
SprintCard.belongsTo(User, { foreignKey: "studentId" });

Course.hasMany(Project, { foreignKey: "courseId", onDelete: "CASCADE" });
Project.belongsTo(Course, { foreignKey: "courseId" });

Project.hasMany(ProjectStudentAccess, { foreignKey: "projectId", onDelete: "CASCADE" });
ProjectStudentAccess.belongsTo(Project, { foreignKey: "projectId" });
User.hasMany(ProjectStudentAccess, { foreignKey: "studentId", onDelete: "CASCADE" });
ProjectStudentAccess.belongsTo(User, { foreignKey: "studentId" });

Project.hasMany(SprintTask, { foreignKey: "projectId", onDelete: "CASCADE" });
SprintTask.belongsTo(Project, { foreignKey: "projectId" });
User.hasMany(SprintTask, { foreignKey: "studentId", onDelete: "CASCADE" });
SprintTask.belongsTo(User, { foreignKey: "studentId" });

Course.hasMany(StreakEntry, { foreignKey: "courseId", onDelete: "CASCADE" });
StreakEntry.belongsTo(Course, { foreignKey: "courseId" });
User.hasMany(StreakEntry, { foreignKey: "studentId", onDelete: "CASCADE" });
StreakEntry.belongsTo(User, { foreignKey: "studentId" });

export {
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
};
