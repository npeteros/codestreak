import type { Timestamp } from "firebase-admin/firestore";

export type UserRole = "INSTRUCTOR" | "STUDENT";
export type ChallengeDifficulty = "EASY" | "MEDIUM" | "HARD";
export type SprintCardStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type JournalTriggerType = "CHALLENGE" | "CHECKIN" | "SPRINT_CARD";

// /users/{uid}
export interface UserDoc {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Timestamp;
}

// /courses/{courseId}
export interface StreakRules {
  challenge: boolean;
  checkin: boolean;
  sprintCard: boolean;
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
  createdAt: Timestamp;
}

// /courses/{courseId}/enrollments/{uid}
export interface EnrollmentDoc {
  studentId: string;
  joinedAt: Timestamp;
}

// /courses/{courseId}/challenges/{challengeId}
export interface ChallengeDoc {
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  topicTag: string;
  starterCode: string;
  scheduledFor: Timestamp;
  isAiGenerated: boolean;
  isDraft: boolean;
  createdAt: Timestamp;
}

// /courses/{courseId}/milestones/{milestoneId}
export interface MilestoneDoc {
  title: string;
  description: string;
  dueDate: Timestamp;
  moduleTag: string;
  isArchived: boolean;
  createdAt: Timestamp;
}

// /students/{uid}/courses/{courseId}/challengeSubmissions/{submissionId}
export interface ChallengeSubmissionDoc {
  challengeId: string;
  code: string;
  submittedAt: Timestamp;
}

// /students/{uid}/courses/{courseId}/checkIns/{checkInId}
export interface CheckInDoc {
  note: string;
  courseId: string;
  createdAt: Timestamp;
}

// Serializable check-in for client components (createdAt as ISO string)
export interface CheckIn {
  id: string;
  note: string;
  courseId: string;
  createdAt: string; // ISO 8601
}

// /students/{uid}/courses/{courseId}/sprintCards/{cardId}
export interface SprintCardDoc {
  title: string;
  description: string;
  status: SprintCardStatus;
  isInstructorSeeded: boolean;
  milestoneId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  movedAt: Timestamp;
}

export type ProjectScope = "ALL_STUDENTS" | "STUDENTS";

// /courses/{courseId}/projects/{projectId}
export interface ProjectDoc {
  courseId: string;
  name: string;
  description?: string;
  scope: ProjectScope;
  studentIds?: string[]; // set iff scope === "STUDENTS"
  isArchived: boolean;
  createdBy: string; // instructor uid
  createdAt: Timestamp;
}

export type SprintTaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

// /courses/{courseId}/projects/{projectId}/studentBoards/{studentId}/tasks/{taskId}
export interface SprintTaskDoc {
  title: string;
  description: string; // markdown source
  dueDate: Timestamp | null;
  status: SprintTaskStatus;
  order: number; // fractional-indexed position within its status column
  createdBy: string;
  createdByRole: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// /students/{uid}/courses/{courseId}/streakEntries/{date}
export interface StreakEntryDoc {
  date: string; // YYYY-MM-DD (document ID)
  sources: {
    challenge: boolean;
    checkin: boolean;
    sprintCard: boolean;
  };
}

// /students/{uid}/courses/{courseId}/journalEntries/{entryId}
export interface JournalEntryDoc {
  content: string;
  createdAt: Timestamp;
  triggerType: JournalTriggerType;
}
