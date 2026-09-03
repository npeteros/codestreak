/**
 * Seed script — populates a full course + activity history for local dev.
 *
 * Usage:
 *   npm run seed
 *
 * Optional overrides: SEED_INSTRUCTOR_UID, SEED_STUDENT_UID.
 */

import argon2 from "argon2";
import {
  sequelize,
  User,
  Course,
  Enrollment,
  Challenge,
  ChallengeSubmission,
  CheckIn,
  JournalEntry,
  SprintCard,
  Project,
  SprintTask,
  StreakEntry,
} from "../lib/db/models";

const SEED_PASSWORD = "Password123!";

const INSTRUCTOR_UID = process.env.SEED_INSTRUCTOR_UID ?? "00000000-0000-4000-8000-000000000001";
const STUDENT_UID = process.env.SEED_STUDENT_UID ?? "00000000-0000-4000-8000-000000000002";

function day(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

function addDays(ymd: string, n: number): string {
  const d = day(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function eachDay(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  let cur = startYmd;
  while (day(cur).getTime() <= day(endYmd).getTime()) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

// Must match the real-world date this is run on — the app computes "today" from the system clock.
const TODAY = "2026-07-15";

const COURSE_ID = "cs201-data-structures";

async function seed() {
  await sequelize.transaction(async (t) => {
    const passwordHash = await argon2.hash(SEED_PASSWORD, { type: argon2.argon2id });

    await User.upsert(
      { id: INSTRUCTOR_UID, email: "instructor@codestreak.test", name: "Jordan Lee", role: "INSTRUCTOR", passwordHash },
      { transaction: t }
    );
    await User.upsert(
      { id: STUDENT_UID, email: "student@codestreak.test", name: "Alex Chen", role: "STUDENT", passwordHash },
      { transaction: t }
    );

    await Course.upsert(
      {
        id: COURSE_ID,
        name: "CS-201 Data Structures",
        description:
          "Learn fundamental data structures and algorithms in Python. Build problem-solving skills through daily challenges and collaborative sprints.",
        languageTag: "python",
        timezone: "America/New_York",
        inviteCode: "CS2011",
        instructorId: INSTRUCTOR_UID,
        streakRuleChallenge: true,
        streakRuleCheckin: true,
        streakRuleSprintCard: true,
        streakRulePractice: true,
        isArchived: false,
        isPublic: false,
        createdAt: day("2026-03-01"),
      },
      { transaction: t }
    );

    await Enrollment.upsert(
      { courseId: COURSE_ID, studentId: STUDENT_UID, joinedAt: day("2026-03-02") },
      { transaction: t }
    );

    const challenges: Array<{
      id: string;
      title: string;
      description: string;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      topicTag: string;
      starterCode: string;
      scheduledFor: string;
      isDraft: boolean;
    }> = [
      {
        id: "ch-two-sum",
        title: "Two Sum",
        description:
          "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nYou may assume each input has exactly one solution and you may not use the same element twice.",
        difficulty: "EASY",
        topicTag: "arrays",
        starterCode:
          "def two_sum(nums: list[int], target: int) -> list[int]:\n    # Your solution here\n    pass\n",
        scheduledFor: addDays(TODAY, -4),
        isDraft: false,
      },
      {
        id: "ch-valid-anagram",
        title: "Valid Anagram",
        description:
          "Given two strings `s` and `t`, return `True` if `t` is an anagram of `s`, and `False` otherwise.\n\nAn anagram is a word formed by rearranging the letters of another word using all original letters exactly once.",
        difficulty: "EASY",
        topicTag: "strings",
        starterCode:
          "def is_anagram(s: str, t: str) -> bool:\n    # Your solution here\n    pass\n",
        scheduledFor: addDays(TODAY, -3),
        isDraft: false,
      },
      {
        id: "ch-reverse-linked-list",
        title: "Reverse Linked List",
        description:
          "Given the head of a singly linked list, reverse the list and return the reversed list.\n\nYou must solve it both iteratively and recursively.",
        difficulty: "MEDIUM",
        topicTag: "linked-lists",
        starterCode:
          "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverse_list(head: ListNode | None) -> ListNode | None:\n    # Your solution here\n    pass\n",
        scheduledFor: addDays(TODAY, -2),
        isDraft: false,
      },
      {
        id: "ch-max-subarray",
        title: "Maximum Subarray",
        description:
          "Given an integer array `nums`, find the subarray with the largest sum and return its sum.\n\nHint: Kadane's algorithm runs in O(n) time.",
        difficulty: "MEDIUM",
        topicTag: "dynamic-programming",
        starterCode: "def max_subarray(nums: list[int]) -> int:\n    # Your solution here\n    pass\n",
        scheduledFor: addDays(TODAY, -1),
        isDraft: false,
      },
      {
        id: "ch-inorder-traversal",
        title: "Binary Tree Inorder Traversal",
        description:
          "Given the root of a binary tree, return the inorder traversal of its node values.\n\nImplement both a recursive and an iterative solution.",
        difficulty: "MEDIUM",
        topicTag: "trees",
        starterCode:
          "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef inorder_traversal(root: TreeNode | None) -> list[int]:\n    # Your solution here\n    pass\n",
        scheduledFor: TODAY,
        isDraft: false,
      },
      {
        id: "ch-kth-largest",
        title: "Kth Largest Element in an Array",
        description:
          "Given an integer array `nums` and an integer `k`, return the `k`th largest element in the array.\n\nAim for better than O(n log n) using a heap.",
        difficulty: "HARD",
        topicTag: "heaps",
        starterCode: "def find_kth_largest(nums: list[int], k: int) -> int:\n    # Your solution here\n    pass\n",
        scheduledFor: addDays(TODAY, 1),
        isDraft: true,
      },
    ];

    for (const ch of challenges) {
      await Challenge.upsert(
        {
          id: ch.id,
          courseId: COURSE_ID,
          title: ch.title,
          description: ch.description,
          difficulty: ch.difficulty,
          topicTag: ch.topicTag,
          starterCode: ch.starterCode,
          scheduledFor: day(ch.scheduledFor),
          kind: "DAILY",
          isAiGenerated: false,
          isDraft: ch.isDraft,
          createdAt: day("2026-03-01"),
        },
        { transaction: t }
      );
    }

    // milestoneId is informational only — the Milestone model is dead.
    const sprintCards: Array<{
      id: string;
      title: string;
      description: string;
      status: "TODO" | "IN_PROGRESS" | "DONE";
      milestoneId: string;
      movedDate: string;
    }> = [
      {
        id: "card-1",
        title: "Implement Two Sum (iterative)",
        description: "Write the hash-map O(n) solution and add edge case tests.",
        status: "DONE",
        milestoneId: "sprint-1",
        movedDate: addDays(TODAY, -4),
      },
      {
        id: "card-2",
        title: "Practice anagram variations",
        description: "Solve at least 3 anagram-style problems on LeetCode and document approach.",
        status: "DONE",
        milestoneId: "sprint-1",
        movedDate: addDays(TODAY, -3),
      },
      {
        id: "card-3",
        title: "Linked list reversal — iterative & recursive",
        description: "Both approaches working; write a short comparison of time/space trade-offs.",
        status: "DONE",
        milestoneId: "sprint-1",
        movedDate: addDays(TODAY, -2),
      },
      {
        id: "card-4",
        title: "Study dynamic programming fundamentals",
        description:
          "Read CLRS chapter 15 intro and implement memoized Fibonacci before tackling DP challenges.",
        status: "IN_PROGRESS",
        milestoneId: "sprint-1",
        movedDate: addDays(TODAY, -1),
      },
      {
        id: "card-5",
        title: "Binary tree traversal implementations",
        description: "Implement inorder, preorder, and postorder — both recursive and stack-based.",
        status: "TODO",
        milestoneId: "sprint-2",
        movedDate: "2026-03-05",
      },
    ];

    for (const card of sprintCards) {
      await SprintCard.upsert(
        {
          id: card.id,
          studentId: STUDENT_UID,
          courseId: COURSE_ID,
          title: card.title,
          description: card.description,
          status: card.status,
          isInstructorSeeded: false,
          milestoneId: card.milestoneId,
          createdAt: day("2026-03-05"),
          updatedAt: day(card.movedDate),
          movedAt: day(card.movedDate),
        },
        { transaction: t }
      );
    }

    const PROJECT_ID = "library-management-system";

    await Project.upsert(
      {
        id: PROJECT_ID,
        courseId: COURSE_ID,
        name: "Library Management System",
        description:
          "Build a small library catalog service: a REST API backed by a proper schema, with search and a checkout flow.",
        scope: "ALL_STUDENTS",
        isArchived: false,
        createdBy: INSTRUCTOR_UID,
        createdAt: day("2026-03-01"),
      },
      { transaction: t }
    );

    const tasks: Array<{
      id: string;
      title: string;
      description: string;
      dueDate: string | null;
      status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
      order: number;
      createdBy: string;
      createdByRole: "INSTRUCTOR" | "STUDENT";
      createdDate: string;
      updatedDate: string;
    }> = [
      {
        id: "task-schema",
        title: "Design database schema",
        description: "Model `books`, `members`, and `checkouts` with foreign keys.",
        dueDate: "2026-03-20",
        status: "DONE",
        order: 1000,
        createdBy: INSTRUCTOR_UID,
        createdByRole: "INSTRUCTOR",
        createdDate: "2026-03-01",
        updatedDate: "2026-03-18",
      },
      {
        id: "task-crud-api",
        title: "Implement book CRUD API",
        description: "Endpoints for creating, listing, updating, and deleting book records.",
        dueDate: addDays(TODAY, -2),
        status: "DONE",
        order: 2000,
        createdBy: INSTRUCTOR_UID,
        createdByRole: "INSTRUCTOR",
        createdDate: "2026-03-20",
        updatedDate: addDays(TODAY, -2),
      },
      {
        id: "task-search",
        title: "Add search & filter feature",
        description: "Filter the catalog by title, author, and availability.",
        dueDate: null,
        status: "IN_REVIEW",
        order: 1000,
        createdBy: STUDENT_UID,
        createdByRole: "STUDENT",
        createdDate: addDays(TODAY, -6),
        updatedDate: addDays(TODAY, -1),
      },
      {
        id: "task-tests",
        title: "Write unit tests for API",
        description: "Cover the CRUD endpoints and edge cases (missing fields, duplicate ISBNs).",
        dueDate: addDays(TODAY, 5),
        status: "IN_PROGRESS",
        order: 1000,
        createdBy: INSTRUCTOR_UID,
        createdByRole: "INSTRUCTOR",
        createdDate: "2026-03-20",
        updatedDate: addDays(TODAY, -1),
      },
      {
        id: "task-deploy",
        title: "Deploy to staging",
        description: "Ship the API to a staging environment once tests are green.",
        dueDate: addDays(TODAY, 10),
        status: "TODO",
        order: 2000,
        createdBy: INSTRUCTOR_UID,
        createdByRole: "INSTRUCTOR",
        createdDate: "2026-03-20",
        updatedDate: "2026-03-20",
      },
      {
        id: "task-checkout-ui",
        title: "Polish UI for checkout flow",
        description: "Add loading and error states around the checkout/return actions.",
        dueDate: TODAY,
        status: "DONE",
        order: 3000,
        createdBy: STUDENT_UID,
        createdByRole: "STUDENT",
        createdDate: addDays(TODAY, -3),
        updatedDate: TODAY,
      },
    ];

    for (const task of tasks) {
      await SprintTask.upsert(
        {
          id: task.id,
          projectId: PROJECT_ID,
          studentId: STUDENT_UID,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate ? day(task.dueDate) : null,
          status: task.status,
          order: String(task.order),
          createdBy: task.createdBy,
          createdByRole: task.createdByRole,
          createdAt: day(task.createdDate),
          updatedAt: day(task.updatedDate),
        },
        { transaction: t }
      );
    }

    const submissions = [
      {
        id: "sub-two-sum",
        challengeId: "ch-two-sum",
        code: "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        comp = target - n\n        if comp in seen:\n            return [seen[comp], i]\n        seen[n] = i\n",
        date: addDays(TODAY, -4),
      },
      {
        id: "sub-anagram",
        challengeId: "ch-valid-anagram",
        code: "def is_anagram(s, t):\n    return sorted(s) == sorted(t)\n",
        date: addDays(TODAY, -3),
      },
      {
        id: "sub-linked-list",
        challengeId: "ch-reverse-linked-list",
        code: "def reverse_list(head):\n    prev = None\n    curr = head\n    while curr:\n        nxt = curr.next\n        curr.next = prev\n        prev = curr\n        curr = nxt\n    return prev\n",
        date: addDays(TODAY, -2),
      },
      {
        id: "sub-max-subarray",
        challengeId: "ch-max-subarray",
        code: "def max_subarray(nums):\n    max_sum = curr = nums[0]\n    for n in nums[1:]:\n        curr = max(n, curr + n)\n        max_sum = max(max_sum, curr)\n    return max_sum\n",
        date: addDays(TODAY, -1),
      },
      {
        id: "sub-inorder-traversal",
        challengeId: "ch-inorder-traversal",
        code: "def inorder_traversal(root):\n    result = []\n    def visit(node):\n        if not node:\n            return\n        visit(node.left)\n        result.append(node.val)\n        visit(node.right)\n    visit(root)\n    return result\n",
        date: TODAY,
      },
    ];

    for (const s of submissions) {
      await ChallengeSubmission.upsert(
        {
          id: s.id,
          studentId: STUDENT_UID,
          courseId: COURSE_ID,
          challengeId: s.challengeId,
          code: s.code,
          submittedAt: new Date(`${s.date}T14:30:00Z`),
        },
        { transaction: t }
      );
    }

    const checkIns = [
      {
        id: "ci-0",
        note: "Reviewed array and hashing basics before diving back into daily challenges. Feeling ready to pick the pace back up.",
        date: addDays(TODAY, -5),
      },
      {
        id: "ci-1",
        note: "Solved Two Sum — the hash map approach clicked. Initially thought O(n²) brute force but found the O(n) solution.",
        date: addDays(TODAY, -4),
      },
      {
        id: "ci-2",
        note: "Anagram challenge was straightforward with sorted(). Explored the Counter approach too as an alternative.",
        date: addDays(TODAY, -3),
      },
      {
        id: "ci-3",
        note: "Linked list reversal was tricky at first. Drew it out on paper — visualizing the pointer swap really helped.",
        date: addDays(TODAY, -2),
      },
      {
        id: "ci-4",
        note: "Kadane's algorithm for max subarray — makes sense once you see the recurrence. Struggled to explain it in words but the code came naturally.",
        date: addDays(TODAY, -1),
      },
      {
        id: "ci-5",
        note: "Inorder traversal recursive version was quick; the iterative stack-based version took longer to get right. Both pass now.",
        date: TODAY,
      },
    ];

    for (const ci of checkIns) {
      await CheckIn.upsert(
        {
          id: ci.id,
          studentId: STUDENT_UID,
          courseId: COURSE_ID,
          note: ci.note,
          createdAt: new Date(`${ci.date}T09:15:00Z`),
        },
        { transaction: t }
      );
    }

    const journalEntries: Array<{
      id: string;
      content: string;
      date: string;
      time: string;
      triggerType: "CHALLENGE" | "CHECKIN" | "SPRINT_CARD";
    }> = [
      {
        id: "journal-1",
        content:
          "Today's Two Sum challenge reminded me that the best solutions often come from changing the question you're asking. Instead of asking 'does a complement exist?', a hash map lets you answer that in O(1). The shift from brute force to optimal felt like a genuine insight — not just a trick to memorize.",
        date: addDays(TODAY, -4),
        time: "15:00:00",
        triggerType: "CHALLENGE",
      },
      {
        id: "journal-2",
        content:
          "Writing today's check-in helped me realize I've been intimidated by linked list problems because I don't visualize the state well. Drawing the before/after pointer diagrams on paper made the reversal obvious. I should diagram more problems before coding.",
        date: addDays(TODAY, -3),
        time: "09:30:00",
        triggerType: "CHECKIN",
      },
      {
        id: "journal-3",
        content:
          "Moving the linked list reversal task to DONE on the project board felt satisfying — it's the first 'hard for me' task I've made visible progress on. Sprint boards are useful for noticing patterns in where I get stuck, not just tracking completion.",
        date: addDays(TODAY, -2),
        time: "16:00:00",
        triggerType: "SPRINT_CARD",
      },
      {
        id: "journal-4",
        content:
          "Kadane's algorithm is a good example of how dynamic programming problems often hide a much simpler recurrence than they first appear to. Once I stopped trying to track every subarray and just asked 'extend or restart', the code wrote itself.",
        date: addDays(TODAY, -1),
        time: "15:30:00",
        triggerType: "CHALLENGE",
      },
      {
        id: "journal-5",
        content:
          "Finishing the checkout-flow polish task and today's inorder traversal challenge in the same day felt good — the recursive traversal mirrors the recursive descent I used designing the checkout state machine. Different problems, same shape.",
        date: TODAY,
        time: "17:00:00",
        triggerType: "CHALLENGE",
      },
    ];

    for (const j of journalEntries) {
      await JournalEntry.upsert(
        {
          id: j.id,
          studentId: STUDENT_UID,
          courseId: COURSE_ID,
          content: j.content,
          createdAt: new Date(`${j.date}T${j.time}Z`),
          triggerType: j.triggerType,
        },
        { transaction: t }
      );
    }

    // Longest streak: 52 days (2026-03-10..2026-04-30). Current: 12 days ending TODAY.
    const ACTIVE_BLOCKS: [string, string][] = [
      ["2026-03-10", "2026-04-30"], // 52 days — longest streak
      ["2026-05-04", "2026-05-08"], // 5 days
      ["2026-05-12", "2026-05-15"], // 4 days
      ["2026-05-20", "2026-05-25"], // 6 days
      ["2026-05-31", "2026-06-02"], // 3 days
      ["2026-06-09", "2026-06-12"], // 4 days
      [addDays(TODAY, -11), TODAY], // 12 days — current streak, ends today
    ];

    type SourceFlags = { challenge: boolean; checkin: boolean; sprintCard: boolean; practice: boolean };

    const DETAILED_SOURCES: Record<string, SourceFlags> = {
      [addDays(TODAY, -5)]: { challenge: false, checkin: true, sprintCard: false, practice: false },
      [addDays(TODAY, -4)]: { challenge: true, checkin: true, sprintCard: false, practice: false },
      [addDays(TODAY, -3)]: { challenge: true, checkin: true, sprintCard: false, practice: true },
      [addDays(TODAY, -2)]: { challenge: true, checkin: true, sprintCard: true, practice: false },
      [addDays(TODAY, -1)]: { challenge: true, checkin: true, sprintCard: false, practice: false },
      [TODAY]: { challenge: true, checkin: true, sprintCard: true, practice: true },
    };

    const streakDates = ACTIVE_BLOCKS.flatMap(([s, e]) => eachDay(s, e));

    if (streakDates.length !== 86) {
      throw new Error(`Expected 86 active days, computed ${streakDates.length}`);
    }
    const longestBlockLen = Math.max(...ACTIVE_BLOCKS.map(([s, e]) => eachDay(s, e).length));
    if (longestBlockLen !== 52) {
      throw new Error(`Expected longest streak of 52, computed ${longestBlockLen}`);
    }
    const currentBlock = ACTIVE_BLOCKS[ACTIVE_BLOCKS.length - 1];
    const currentBlockLen = eachDay(currentBlock[0], currentBlock[1]).length;
    if (currentBlockLen !== 12 || currentBlock[1] !== TODAY) {
      throw new Error(`Expected current streak of 12 ending today, computed ${currentBlockLen}`);
    }

    for (const date of streakDates) {
      const sources = DETAILED_SOURCES[date] ?? {
        challenge: false,
        checkin: true,
        sprintCard: false,
        practice: false,
      };
      await StreakEntry.upsert(
        {
          studentId: STUDENT_UID,
          courseId: COURSE_ID,
          date,
          challenge: sources.challenge,
          checkin: sources.checkin,
          sprintCard: sources.sprintCard,
          practice: sources.practice,
        },
        { transaction: t }
      );
    }

    console.log("✓ Seed complete.");
    console.log(`  Course:      ${COURSE_ID}`);
    console.log(`  Instructor:  ${INSTRUCTOR_UID} (instructor@codestreak.test / ${SEED_PASSWORD})`);
    console.log(`  Student:     ${STUDENT_UID} (student@codestreak.test / ${SEED_PASSWORD})`);
    console.log(`  Streak days: ${streakDates.length} active (longest 52, current 12)`);
  });
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
