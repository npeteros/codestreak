// Shared domain types — the shapes lib/repositories/*.ts return, independent
// of any storage backend.

export type UserRole = "INSTRUCTOR" | "STUDENT";
export type ChallengeDifficulty = "EASY" | "MEDIUM" | "HARD";
export type ChallengeKind = "DAILY" | "PRACTICE";
export type SprintCardStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type JournalTriggerType = "CHALLENGE" | "CHECKIN" | "SPRINT_CARD";
export type SubmissionVerdict = "CORRECT" | "PARTIALLY_CORRECT" | "INCORRECT" | "UNABLE_TO_ASSESS";
export type HintChatRole = "user" | "assistant";
export type HintStyle = "socratic" | "direct";
export type ProjectScope = "ALL_STUDENTS" | "STUDENTS";
export type SprintTaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface UserDoc {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface StreakRules {
  challenge: boolean;
  checkin: boolean;
  sprintCard: boolean;
  practice: boolean;
}

export interface CourseDoc {
  name: string;
  description: string;
  languageTag: string;
  timezone: string;
  inviteCode: string;
  instructorId: string;
  streakRules: StreakRules;
  isArchived: boolean;
  isPublic: boolean;
  createdAt: Date;
}

export interface ChallengeDoc {
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  topicTag: string;
  starterCode: string;
  scheduledFor?: Date; // meaningful only for kind:"DAILY" — practice challenges omit it
  kind: ChallengeKind;
  isAiGenerated: boolean;
  isDraft: boolean;
  createdAt: Date;
}

export interface SubmissionAiFeedback {
  verdict: SubmissionVerdict;
  celebrate: string;
  improve: string;
}

export interface HintChatMessage {
  role: HintChatRole;
  content: string;
}

export interface ChallengeSubmissionDoc {
  challengeId: string;
  code: string;
  submittedAt: Date;
  aiVerdict: SubmissionVerdict | null;
  aiCelebrate: string | null;
  aiImprove: string | null;
  aiFeedbackAt: Date | null;
}

export interface ChallengeAttemptDoc {
  challengeId: string;
  code: string;
  submittedAt: Date;
  aiVerdict: SubmissionVerdict | null;
  aiCelebrate: string | null;
  aiImprove: string | null;
  aiFeedbackAt: Date | null;
}

export interface CheckInDoc {
  note: string;
  courseId: string;
  createdAt: Date;
}

// Serializable check-in for client components (createdAt as ISO string)
export interface CheckIn {
  id: string;
  note: string;
  courseId: string;
  createdAt: string; // ISO 8601
}

export interface SprintCardDoc {
  title: string;
  description: string;
  status: SprintCardStatus;
  isInstructorSeeded: boolean;
  milestoneId?: string;
  createdAt: Date;
  updatedAt: Date;
  movedAt: Date;
}

export interface ProjectDoc {
  courseId: string;
  name: string;
  description?: string;
  scope: ProjectScope;
  studentIds?: string[]; // set iff scope === "STUDENTS"
  isArchived: boolean;
  createdBy: string; // instructor uid
  createdAt: Date;
}

export interface SprintTaskDoc {
  title: string;
  description: string; // markdown source
  dueDate: Date | null;
  status: SprintTaskStatus;
  order: number; // fractional-indexed position within its status column
  createdBy: string;
  createdByRole: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface StreakEntryDoc {
  date: string; // YYYY-MM-DD (natural key)
  sources: {
    challenge: boolean;
    checkin: boolean;
    sprintCard: boolean;
    practice: boolean;
  };
}

export interface JournalEntryDoc {
  content: string;
  createdAt: Date;
  triggerType: JournalTriggerType;
}
