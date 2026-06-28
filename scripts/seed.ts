/**
 * Seed script for Firestore — populates all collections except /users.
 *
 * Prerequisites:
 *   1. Create two Firebase Auth users manually (or via signup flow) and paste
 *      their UIDs below, OR set SEED_INSTRUCTOR_UID / SEED_STUDENT1_UID /
 *      SEED_STUDENT2_UID environment variables before running.
 *   2. Ensure .env contains valid FIREBASE_ADMIN_* credentials.
 *
 * Usage:
 *   npm run seed
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// ─── Configurable UIDs ────────────────────────────────────────────────────────
// Replace these with real Firebase Auth UIDs, or set the env vars.
const INSTRUCTOR_UID = "t8WIpBtkRwS5XNMvMERygjPl3N92";
const STUDENT1_UID = "nEyTvfLB8PabAgXalAy2Mxj7GxW2";
const STUDENT2_UID = "15fC88qM66YC5ki9lkubhDIdIB83";
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);

function ts(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

function day(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

const TODAY = "2026-06-27";

async function seed() {
  const batch = db.batch();

  // ════════════════════════════════════════════════════════════════════════════
  // COURSE 1 — CS-201 Data Structures (Python)
  // ════════════════════════════════════════════════════════════════════════════

  const COURSE1_ID = "cs201-data-structures";
  const course1Ref = db.collection("courses").doc(COURSE1_ID);

  batch.set(course1Ref, {
    name: "CS-201 Data Structures",
    description:
      "Learn fundamental data structures and algorithms in Python. Build problem-solving skills through daily challenges and collaborative sprints.",
    languageTag: "python",
    timezone: "America/New_York",
    inviteCode: "CS2011",
    instructorId: INSTRUCTOR_UID,
    streakRules: { challenge: true, checkin: true, sprintCard: true },
    isArchived: false,
    createdAt: ts(day("2026-06-15")),
  });

  // ── Enrollments ─────────────────────────────────────────────────────────────
  batch.set(course1Ref.collection("enrollments").doc(STUDENT1_UID), {
    studentId: STUDENT1_UID,
    joinedAt: ts(day("2026-06-17")),
  });

  batch.set(course1Ref.collection("enrollments").doc(STUDENT2_UID), {
    studentId: STUDENT2_UID,
    joinedAt: ts(day("2026-06-18")),
  });

  // ── Challenges ──────────────────────────────────────────────────────────────
  const course1Challenges: {
    id: string;
    title: string;
    description: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    topicTag: string;
    starterCode: string;
    scheduledFor: string;
    isDraft: boolean;
  }[] = [
    {
      id: "ch-two-sum",
      title: "Two Sum",
      description:
        "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nYou may assume each input has exactly one solution and you may not use the same element twice.",
      difficulty: "EASY",
      topicTag: "arrays",
      starterCode:
        "def two_sum(nums: list[int], target: int) -> list[int]:\n    # Your solution here\n    pass\n",
      scheduledFor: "2026-06-24",
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
      scheduledFor: "2026-06-25",
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
      scheduledFor: "2026-06-26",
      isDraft: false,
    },
    {
      id: "ch-max-subarray",
      title: "Maximum Subarray",
      description:
        "Given an integer array `nums`, find the subarray with the largest sum and return its sum.\n\nHint: Kadane's algorithm runs in O(n) time.",
      difficulty: "MEDIUM",
      topicTag: "dynamic-programming",
      starterCode:
        "def max_subarray(nums: list[int]) -> int:\n    # Your solution here\n    pass\n",
      scheduledFor: TODAY,
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
      scheduledFor: "2026-06-28",
      isDraft: true,
    },
  ];

  for (const ch of course1Challenges) {
    batch.set(course1Ref.collection("challenges").doc(ch.id), {
      title: ch.title,
      description: ch.description,
      difficulty: ch.difficulty,
      topicTag: ch.topicTag,
      starterCode: ch.starterCode,
      scheduledFor: ts(day(ch.scheduledFor)),
      isAiGenerated: false,
      isDraft: ch.isDraft,
      createdAt: ts(day("2026-06-15")),
    });
  }

  // ── Milestones ──────────────────────────────────────────────────────────────
  batch.set(course1Ref.collection("milestones").doc("sprint-1"), {
    title: "Sprint 1: Arrays & Strings",
    description:
      "Cover foundational array and string manipulation techniques. Complete at least 4 challenges and move 3 sprint cards to DONE.",
    dueDate: ts(day("2026-06-30")),
    moduleTag: "module-1",
    isArchived: false,
    createdAt: ts(day("2026-06-15")),
  });

  batch.set(course1Ref.collection("milestones").doc("sprint-2"), {
    title: "Sprint 2: Trees & Graphs",
    description:
      "Explore tree traversals and basic graph search algorithms (BFS, DFS). Complete at least 4 challenges and deliver a working traversal implementation.",
    dueDate: ts(day("2026-07-14")),
    moduleTag: "module-2",
    isArchived: false,
    createdAt: ts(day("2026-06-15")),
  });

  // ── Student hub docs ────────────────────────────────────────────────────────
  function student1Course1Ref() {
    return db
      .collection("students")
      .doc(STUDENT1_UID)
      .collection("courses")
      .doc(COURSE1_ID);
  }

  function student2Course1Ref() {
    return db
      .collection("students")
      .doc(STUDENT2_UID)
      .collection("courses")
      .doc(COURSE1_ID);
  }

  batch.set(student1Course1Ref(), {
    courseId: COURSE1_ID,
    courseName: "CS-201 Data Structures",
    timezone: "America/New_York",
    enrolledAt: ts(day("2026-06-17")),
  });

  batch.set(student2Course1Ref(), {
    courseId: COURSE1_ID,
    courseName: "CS-201 Data Structures",
    timezone: "America/New_York",
    enrolledAt: ts(day("2026-06-18")),
  });

  // ── Student 1 (Alice) — strong streak, 4 submissions ───────────────────────
  const alice1 = student1Course1Ref();

  const aliceC1Submissions = [
    {
      id: "sub-alice-two-sum",
      challengeId: "ch-two-sum",
      code: "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        comp = target - n\n        if comp in seen:\n            return [seen[comp], i]\n        seen[n] = i\n",
      date: "2026-06-24",
    },
    {
      id: "sub-alice-anagram",
      challengeId: "ch-valid-anagram",
      code: "def is_anagram(s, t):\n    return sorted(s) == sorted(t)\n",
      date: "2026-06-25",
    },
    {
      id: "sub-alice-linked-list",
      challengeId: "ch-reverse-linked-list",
      code: "def reverse_list(head):\n    prev = None\n    curr = head\n    while curr:\n        nxt = curr.next\n        curr.next = prev\n        prev = curr\n        curr = nxt\n    return prev\n",
      date: "2026-06-26",
    },
    {
      id: "sub-alice-max-subarray",
      challengeId: "ch-max-subarray",
      code: "def max_subarray(nums):\n    max_sum = curr = nums[0]\n    for n in nums[1:]:\n        curr = max(n, curr + n)\n        max_sum = max(max_sum, curr)\n    return max_sum\n",
      date: TODAY,
    },
  ];

  for (const s of aliceC1Submissions) {
    batch.set(alice1.collection("challengeSubmissions").doc(s.id), {
      challengeId: s.challengeId,
      code: s.code,
      submittedAt: ts(new Date(`${s.date}T14:30:00Z`)),
    });
  }

  const aliceC1CheckIns = [
    {
      id: "ci-alice-0623",
      note: "Reviewed array basics today. Feeling confident about indexing and slicing after re-reading the docs.",
      date: "2026-06-23",
    },
    {
      id: "ci-alice-0624",
      note: "Solved Two Sum — the hash map approach clicked. Initially thought O(n²) brute force but found the O(n) solution.",
      date: "2026-06-24",
    },
    {
      id: "ci-alice-0625",
      note: "Anagram challenge was straightforward with sorted(). Explored the Counter approach too as an alternative.",
      date: "2026-06-25",
    },
    {
      id: "ci-alice-0626",
      note: "Linked list reversal was tricky at first. Drew it out on paper — visualizing the pointer swap really helped.",
      date: "2026-06-26",
    },
    {
      id: "ci-alice-0627",
      note: "Kadane's algorithm for max subarray — makes sense once you see the recurrence. Struggled to explain it in words but the code came naturally.",
      date: TODAY,
    },
  ];

  for (const ci of aliceC1CheckIns) {
    batch.set(alice1.collection("checkIns").doc(ci.id), {
      note: ci.note,
      courseId: COURSE1_ID,
      createdAt: ts(new Date(`${ci.date}T09:15:00Z`)),
    });
  }

  const aliceC1Cards = [
    {
      id: "card-alice-1",
      title: "Implement Two Sum (iterative)",
      description: "Write the hash-map O(n) solution and add edge case tests.",
      status: "DONE",
      milestoneId: "sprint-1",
      movedDate: "2026-06-24",
    },
    {
      id: "card-alice-2",
      title: "Practice anagram variations",
      description:
        "Solve at least 3 anagram-style problems on LeetCode and document approach.",
      status: "DONE",
      milestoneId: "sprint-1",
      movedDate: "2026-06-25",
    },
    {
      id: "card-alice-3",
      title: "Linked list reversal — iterative & recursive",
      description:
        "Both approaches working; write a short comparison of time/space trade-offs.",
      status: "IN_PROGRESS",
      milestoneId: "sprint-1",
      movedDate: "2026-06-26",
    },
    {
      id: "card-alice-4",
      title: "Study dynamic programming fundamentals",
      description:
        "Read CLRS chapter 15 intro and implement memoized Fibonacci before tackling DP challenges.",
      status: "TODO",
      milestoneId: "sprint-1",
      movedDate: "2026-06-20",
    },
    {
      id: "card-alice-5",
      title: "Binary tree traversal implementations",
      description:
        "Implement inorder, preorder, and postorder — both recursive and stack-based.",
      status: "TODO",
      milestoneId: "sprint-2",
      movedDate: "2026-06-20",
    },
  ] as const;

  for (const card of aliceC1Cards) {
    batch.set(alice1.collection("sprintCards").doc(card.id), {
      title: card.title,
      description: card.description,
      status: card.status,
      isInstructorSeeded: false,
      milestoneId: card.milestoneId,
      createdAt: ts(day("2026-06-20")),
      updatedAt: ts(day(card.movedDate)),
      movedAt: ts(day(card.movedDate)),
    });
  }

  const aliceC1StreakDays = [
    { date: "2026-06-21", challenge: false, checkin: true, sprintCard: true },
    { date: "2026-06-22", challenge: false, checkin: true, sprintCard: true },
    { date: "2026-06-23", challenge: false, checkin: true, sprintCard: false },
    { date: "2026-06-24", challenge: true, checkin: true, sprintCard: true },
    { date: "2026-06-25", challenge: true, checkin: true, sprintCard: true },
    { date: "2026-06-26", challenge: true, checkin: true, sprintCard: true },
    { date: TODAY, challenge: true, checkin: true, sprintCard: false },
  ];

  for (const entry of aliceC1StreakDays) {
    batch.set(alice1.collection("streakEntries").doc(entry.date), {
      date: entry.date,
      sources: {
        challenge: entry.challenge,
        checkin: entry.checkin,
        sprintCard: entry.sprintCard,
      },
    });
  }

  batch.set(alice1.collection("journalEntries").doc("journal-alice-1"), {
    content:
      "Today's Two Sum challenge reminded me that the best solutions often come from changing the question you're asking. Instead of asking 'does a complement exist?', a hash map lets you answer that in O(1). The shift from brute force to optimal felt like a genuine insight — not just a trick to memorize.",
    createdAt: ts(new Date("2026-06-24T15:00:00Z")),
    triggerType: "CHALLENGE",
  });

  batch.set(alice1.collection("journalEntries").doc("journal-alice-2"), {
    content:
      "Writing today's check-in helped me realize I've been intimidated by linked list problems because I don't visualize the state well. Drawing the before/after pointer diagrams on paper made the reversal obvious. I should diagram more problems before coding.",
    createdAt: ts(new Date("2026-06-26T09:30:00Z")),
    triggerType: "CHECKIN",
  });

  batch.set(alice1.collection("journalEntries").doc("journal-alice-3"), {
    content:
      "Moving the reversal card to IN_PROGRESS felt satisfying — it's the first 'hard for me' task I've made visible progress on. Sprint boards are useful for noticing patterns in where I get stuck, not just tracking completion.",
    createdAt: ts(new Date("2026-06-26T14:00:00Z")),
    triggerType: "SPRINT_CARD",
  });

  // ── Student 2 (Bob) — patchy streak, 3 submissions ─────────────────────────
  const bob1 = student2Course1Ref();

  const bobC1Submissions = [
    {
      id: "sub-bob-two-sum",
      challengeId: "ch-two-sum",
      code: "def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n",
      date: "2026-06-24",
    },
    {
      id: "sub-bob-anagram",
      challengeId: "ch-valid-anagram",
      code: "from collections import Counter\ndef is_anagram(s, t):\n    return Counter(s) == Counter(t)\n",
      date: "2026-06-25",
    },
    {
      id: "sub-bob-max-subarray",
      challengeId: "ch-max-subarray",
      code: "def max_subarray(nums):\n    best = curr = nums[0]\n    for n in nums[1:]:\n        curr = max(n, curr + n)\n        best = max(best, curr)\n    return best\n",
      date: TODAY,
    },
  ];

  for (const s of bobC1Submissions) {
    batch.set(bob1.collection("challengeSubmissions").doc(s.id), {
      challengeId: s.challengeId,
      code: s.code,
      submittedAt: ts(new Date(`${s.date}T18:45:00Z`)),
    });
  }

  const bobC1CheckIns = [
    {
      id: "ci-bob-0624",
      note: "Finally got back to Two Sum — brute force works but I know there's a faster way. Will revisit.",
      date: "2026-06-24",
    },
    {
      id: "ci-bob-0625",
      note: "Counter from collections is handy. Glad I looked that up instead of manually building frequency maps.",
      date: "2026-06-25",
    },
    {
      id: "ci-bob-0627",
      note: "Kadane's was confusing at first but after watching an explanation video it made sense. Submitted today.",
      date: TODAY,
    },
  ];

  for (const ci of bobC1CheckIns) {
    batch.set(bob1.collection("checkIns").doc(ci.id), {
      note: ci.note,
      courseId: COURSE1_ID,
      createdAt: ts(new Date(`${ci.date}T20:00:00Z`)),
    });
  }

  const bobC1Cards = [
    {
      id: "card-bob-1",
      title: "Implement Two Sum",
      description: "Start with brute force, then optimize to O(n) with a map.",
      status: "DONE" as const,
      milestoneId: "sprint-1",
      movedDate: "2026-06-24",
    },
    {
      id: "card-bob-2",
      title: "String manipulation practice",
      description:
        "Work through 3 string problems including anagram and palindrome checks.",
      status: "IN_PROGRESS" as const,
      milestoneId: "sprint-1",
      movedDate: "2026-06-25",
    },
    {
      id: "card-bob-3",
      title: "Linked list fundamentals",
      description:
        "Understand node structure and pointer manipulation before attempting reversal.",
      status: "TODO" as const,
      milestoneId: "sprint-1",
      movedDate: "2026-06-18",
    },
  ];

  for (const card of bobC1Cards) {
    batch.set(bob1.collection("sprintCards").doc(card.id), {
      title: card.title,
      description: card.description,
      status: card.status,
      isInstructorSeeded: false,
      milestoneId: card.milestoneId,
      createdAt: ts(day("2026-06-18")),
      updatedAt: ts(day(card.movedDate)),
      movedAt: ts(day(card.movedDate)),
    });
  }

  const bobC1StreakDays = [
    { date: "2026-06-21", challenge: false, checkin: false, sprintCard: true },
    { date: "2026-06-22", challenge: false, checkin: false, sprintCard: true },
    // gap: 2026-06-23 missing
    { date: "2026-06-24", challenge: true, checkin: true, sprintCard: true },
    { date: "2026-06-25", challenge: true, checkin: true, sprintCard: true },
    // gap: 2026-06-26 missing
    { date: TODAY, challenge: true, checkin: true, sprintCard: false },
  ];

  for (const entry of bobC1StreakDays) {
    batch.set(bob1.collection("streakEntries").doc(entry.date), {
      date: entry.date,
      sources: {
        challenge: entry.challenge,
        checkin: entry.checkin,
        sprintCard: entry.sprintCard,
      },
    });
  }

  batch.set(bob1.collection("journalEntries").doc("journal-bob-1"), {
    content:
      "The Two Sum O(n²) solution works, but I can feel there's a smarter way. A classmate mentioned hash maps — I need to look into that. Writing this check-in made me realize I'm avoiding the optimization step because I'm not fully comfortable with dictionaries yet.",
    createdAt: ts(new Date("2026-06-24T19:00:00Z")),
    triggerType: "CHALLENGE",
  });

  batch.set(bob1.collection("journalEntries").doc("journal-bob-2"), {
    content:
      "Marking the Two Sum card DONE felt good but I know my solution is O(n²). Adding a note to revisit it. There's a gap between 'it works' and 'it's good' that I want to close this sprint.",
    createdAt: ts(new Date("2026-06-24T19:30:00Z")),
    triggerType: "SPRINT_CARD",
  });

  // ════════════════════════════════════════════════════════════════════════════
  // COURSE 2 — WD-101 Introduction to Web Development (JavaScript)
  // ════════════════════════════════════════════════════════════════════════════

  const COURSE2_ID = "wd101-web-development";
  const course2Ref = db.collection("courses").doc(COURSE2_ID);

  batch.set(course2Ref, {
    name: "WD-101 Introduction to Web Development",
    description:
      "Build interactive web pages from scratch using HTML, CSS, and JavaScript. Daily challenges reinforce fundamentals through hands-on practice with real browser APIs.",
    languageTag: "javascript",
    timezone: "America/New_York",
    inviteCode: "WD1011",
    instructorId: INSTRUCTOR_UID,
    streakRules: { challenge: true, checkin: true, sprintCard: true },
    isArchived: false,
    createdAt: ts(day("2026-06-15")),
  });

  // ── Enrollments ─────────────────────────────────────────────────────────────
  batch.set(course2Ref.collection("enrollments").doc(STUDENT1_UID), {
    studentId: STUDENT1_UID,
    joinedAt: ts(day("2026-06-17")),
  });

  batch.set(course2Ref.collection("enrollments").doc(STUDENT2_UID), {
    studentId: STUDENT2_UID,
    joinedAt: ts(day("2026-06-17")),
  });

  // ── Challenges ──────────────────────────────────────────────────────────────
  const course2Challenges: {
    id: string;
    title: string;
    description: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    topicTag: string;
    starterCode: string;
    scheduledFor: string;
    isDraft: boolean;
  }[] = [
    {
      id: "ch-flatten-array",
      title: "Flatten Nested Array",
      description:
        "Write a function `flattenArray(arr)` that takes a deeply nested array and returns a new flat array containing all values.\n\nExample: `flattenArray([1, [2, [3, [4]]]])` → `[1, 2, 3, 4]`\n\nDo not use `Array.prototype.flat()`.",
      difficulty: "EASY",
      topicTag: "arrays",
      starterCode:
        "/**\n * @param {any[]} arr\n * @returns {any[]}\n */\nfunction flattenArray(arr) {\n  // Your solution here\n}\n",
      scheduledFor: "2026-06-24",
      isDraft: false,
    },
    {
      id: "ch-debounce",
      title: "Implement Debounce",
      description:
        "Implement a `debounce(fn, delay)` function that returns a debounced version of `fn`. The debounced function delays invoking `fn` until `delay` ms have passed since the last call.\n\nThis pattern is essential for search inputs and window resize handlers.",
      difficulty: "MEDIUM",
      topicTag: "functions",
      starterCode:
        "/**\n * @param {Function} fn\n * @param {number} delay\n * @returns {Function}\n */\nfunction debounce(fn, delay) {\n  // Your solution here\n}\n",
      scheduledFor: "2026-06-25",
      isDraft: false,
    },
    {
      id: "ch-dom-todo",
      title: "DOM To-Do List",
      description:
        "Given an empty `<ul id=\"list\">` in the document, write JavaScript that:\n1. Reads a value from `<input id=\"task-input\">`\n2. On button click, appends a new `<li>` with that text\n3. Clicking an `<li>` toggles a `completed` CSS class on it\n\nNo frameworks — vanilla DOM APIs only.",
      difficulty: "EASY",
      topicTag: "dom",
      starterCode:
        "const input = document.getElementById('task-input');\nconst list = document.getElementById('list');\nconst btn = document.getElementById('add-btn');\n\n// Your solution here\n",
      scheduledFor: "2026-06-26",
      isDraft: false,
    },
    {
      id: "ch-fetch-users",
      title: "Fetch & Render Users",
      description:
        "Use the Fetch API to GET `https://jsonplaceholder.typicode.com/users`, then render each user's `name` and `email` into the `<ul id=\"users\">` element.\n\nHandle loading and error states. Use `async/await` — no `.then()` chains.",
      difficulty: "MEDIUM",
      topicTag: "async",
      starterCode:
        "async function loadUsers() {\n  const list = document.getElementById('users');\n  // Your solution here\n}\n\nloadUsers();\n",
      scheduledFor: TODAY,
      isDraft: false,
    },
    {
      id: "ch-event-delegation",
      title: "Event Delegation Pattern",
      description:
        "A `<ul id=\"menu\">` will have items added dynamically. Attach a **single** event listener to `#menu` (not to each `<li>`) that logs the text content of any clicked `<li>`.\n\nExplain in a comment why delegation is more efficient than per-element listeners.",
      difficulty: "MEDIUM",
      topicTag: "dom",
      starterCode:
        "const menu = document.getElementById('menu');\n\n// Your solution here\n",
      scheduledFor: "2026-06-28",
      isDraft: true,
    },
  ];

  for (const ch of course2Challenges) {
    batch.set(course2Ref.collection("challenges").doc(ch.id), {
      title: ch.title,
      description: ch.description,
      difficulty: ch.difficulty,
      topicTag: ch.topicTag,
      starterCode: ch.starterCode,
      scheduledFor: ts(day(ch.scheduledFor)),
      isAiGenerated: false,
      isDraft: ch.isDraft,
      createdAt: ts(day("2026-06-15")),
    });
  }

  // ── Milestones ──────────────────────────────────────────────────────────────
  batch.set(course2Ref.collection("milestones").doc("sprint-1"), {
    title: "Sprint 1: JavaScript Fundamentals",
    description:
      "Master core JavaScript: arrays, functions, closures, and async patterns. Complete at least 3 challenges and move 2 sprint cards to DONE.",
    dueDate: ts(day("2026-06-30")),
    moduleTag: "module-1",
    isArchived: false,
    createdAt: ts(day("2026-06-15")),
  });

  batch.set(course2Ref.collection("milestones").doc("sprint-2"), {
    title: "Sprint 2: DOM & Browser APIs",
    description:
      "Build interactive UIs using the DOM, event system, and Fetch API. Deliver a small working page that uses at least two browser APIs.",
    dueDate: ts(day("2026-07-14")),
    moduleTag: "module-2",
    isArchived: false,
    createdAt: ts(day("2026-06-15")),
  });

  // ── Student hub docs ────────────────────────────────────────────────────────
  function student1Course2Ref() {
    return db
      .collection("students")
      .doc(STUDENT1_UID)
      .collection("courses")
      .doc(COURSE2_ID);
  }

  function student2Course2Ref() {
    return db
      .collection("students")
      .doc(STUDENT2_UID)
      .collection("courses")
      .doc(COURSE2_ID);
  }

  batch.set(student1Course2Ref(), {
    courseId: COURSE2_ID,
    courseName: "WD-101 Introduction to Web Development",
    timezone: "America/New_York",
    enrolledAt: ts(day("2026-06-17")),
  });

  batch.set(student2Course2Ref(), {
    courseId: COURSE2_ID,
    courseName: "WD-101 Introduction to Web Development",
    timezone: "America/New_York",
    enrolledAt: ts(day("2026-06-17")),
  });

  // ── Student 1 (Alice) — consistent, 4 submissions ───────────────────────────
  const alice2 = student1Course2Ref();

  const aliceC2Submissions = [
    {
      id: "sub-alice-flatten",
      challengeId: "ch-flatten-array",
      code: "function flattenArray(arr) {\n  return arr.reduce((acc, val) =>\n    Array.isArray(val) ? acc.concat(flattenArray(val)) : acc.concat(val)\n  , []);\n}\n",
      date: "2026-06-24",
    },
    {
      id: "sub-alice-debounce",
      challengeId: "ch-debounce",
      code: "function debounce(fn, delay) {\n  let timer;\n  return function(...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), delay);\n  };\n}\n",
      date: "2026-06-25",
    },
    {
      id: "sub-alice-dom-todo",
      challengeId: "ch-dom-todo",
      code: "btn.addEventListener('click', () => {\n  const text = input.value.trim();\n  if (!text) return;\n  const li = document.createElement('li');\n  li.textContent = text;\n  li.addEventListener('click', () => li.classList.toggle('completed'));\n  list.appendChild(li);\n  input.value = '';\n});\n",
      date: "2026-06-26",
    },
    {
      id: "sub-alice-fetch-users",
      challengeId: "ch-fetch-users",
      code: "async function loadUsers() {\n  const list = document.getElementById('users');\n  list.textContent = 'Loading...';\n  try {\n    const res = await fetch('https://jsonplaceholder.typicode.com/users');\n    if (!res.ok) throw new Error(`HTTP ${res.status}`);\n    const users = await res.json();\n    list.innerHTML = users.map(u =>\n      `<li>${u.name} — ${u.email}</li>`\n    ).join('');\n  } catch (err) {\n    list.textContent = `Error: ${err.message}`;\n  }\n}\n",
      date: TODAY,
    },
  ];

  for (const s of aliceC2Submissions) {
    batch.set(alice2.collection("challengeSubmissions").doc(s.id), {
      challengeId: s.challengeId,
      code: s.code,
      submittedAt: ts(new Date(`${s.date}T14:00:00Z`)),
    });
  }

  const aliceC2CheckIns = [
    {
      id: "ci-alice-wd-0623",
      note: "Reviewed recursion before starting the array challenges. Feels more natural than it did last semester.",
      date: "2026-06-23",
    },
    {
      id: "ci-alice-wd-0624",
      note: "Flatten with reduce was elegant once I remembered that concat spreads one level. Recursive call for nesting was the key insight.",
      date: "2026-06-24",
    },
    {
      id: "ci-alice-wd-0625",
      note: "Debounce clicked when I realized it's just 'reset a timer on every call'. The closure keeping the timer variable alive makes it work.",
      date: "2026-06-25",
    },
    {
      id: "ci-alice-wd-0626",
      note: "DOM manipulation feels verbose compared to React but understanding the raw API makes frameworks less magical.",
      date: "2026-06-26",
    },
    {
      id: "ci-alice-wd-0627",
      note: "Fetch with async/await is so much cleaner than XMLHttpRequest. Added a loading state before the await — good habit.",
      date: TODAY,
    },
  ];

  for (const ci of aliceC2CheckIns) {
    batch.set(alice2.collection("checkIns").doc(ci.id), {
      note: ci.note,
      courseId: COURSE2_ID,
      createdAt: ts(new Date(`${ci.date}T10:00:00Z`)),
    });
  }

  const aliceC2Cards = [
    {
      id: "card-alice-wd-1",
      title: "Implement flatten without .flat()",
      description: "Use recursion + reduce. Test with 4+ levels of nesting.",
      status: "DONE",
      milestoneId: "sprint-1",
      movedDate: "2026-06-24",
    },
    {
      id: "card-alice-wd-2",
      title: "Build and test debounce utility",
      description:
        "Write debounce, test with a mock function and fake timers (jest.useFakeTimers).",
      status: "DONE",
      milestoneId: "sprint-1",
      movedDate: "2026-06-25",
    },
    {
      id: "card-alice-wd-3",
      title: "Interactive to-do list page",
      description:
        "Add, complete, and delete tasks. Style with CSS — no frameworks.",
      status: "IN_PROGRESS",
      milestoneId: "sprint-2",
      movedDate: "2026-06-26",
    },
    {
      id: "card-alice-wd-4",
      title: "Explore event bubbling & capturing",
      description:
        "Read MDN on event propagation. Write a small demo showing both phases.",
      status: "TODO",
      milestoneId: "sprint-2",
      movedDate: "2026-06-20",
    },
  ] as const;

  for (const card of aliceC2Cards) {
    batch.set(alice2.collection("sprintCards").doc(card.id), {
      title: card.title,
      description: card.description,
      status: card.status,
      isInstructorSeeded: false,
      milestoneId: card.milestoneId,
      createdAt: ts(day("2026-06-20")),
      updatedAt: ts(day(card.movedDate)),
      movedAt: ts(day(card.movedDate)),
    });
  }

  const aliceC2StreakDays = [
    { date: "2026-06-21", challenge: false, checkin: true, sprintCard: true },
    { date: "2026-06-22", challenge: false, checkin: true, sprintCard: false },
    { date: "2026-06-23", challenge: false, checkin: true, sprintCard: false },
    { date: "2026-06-24", challenge: true, checkin: true, sprintCard: true },
    { date: "2026-06-25", challenge: true, checkin: true, sprintCard: true },
    { date: "2026-06-26", challenge: true, checkin: true, sprintCard: true },
    { date: TODAY, challenge: true, checkin: true, sprintCard: false },
  ];

  for (const entry of aliceC2StreakDays) {
    batch.set(alice2.collection("streakEntries").doc(entry.date), {
      date: entry.date,
      sources: {
        challenge: entry.challenge,
        checkin: entry.checkin,
        sprintCard: entry.sprintCard,
      },
    });
  }

  batch.set(alice2.collection("journalEntries").doc("journal-alice-wd-1"), {
    content:
      "The debounce challenge made me realize how much of JavaScript's power comes from closures. The timer variable 'lives' inside the returned function because of lexical scope — it's not magic, it's just how function environments work. I want to find more examples of this pattern in real codebases.",
    createdAt: ts(new Date("2026-06-25T14:30:00Z")),
    triggerType: "CHALLENGE",
  });

  batch.set(alice2.collection("journalEntries").doc("journal-alice-wd-2"), {
    content:
      "Moving the to-do list card to IN_PROGRESS. It's the first time I've built something that actually looks like a real feature. The gap between 'it works in the console' and 'it works in the browser' is where most of the learning happens.",
    createdAt: ts(new Date("2026-06-26T15:00:00Z")),
    triggerType: "SPRINT_CARD",
  });

  // ── Student 2 (Bob) — sporadic engagement, 2 submissions ───────────────────
  const bob2 = student2Course2Ref();

  const bobC2Submissions = [
    {
      id: "sub-bob-flatten",
      challengeId: "ch-flatten-array",
      code: "function flattenArray(arr) {\n  const result = [];\n  function helper(a) {\n    for (const item of a) {\n      if (Array.isArray(item)) helper(item);\n      else result.push(item);\n    }\n  }\n  helper(arr);\n  return result;\n}\n",
      date: "2026-06-24",
    },
    {
      id: "sub-bob-dom-todo",
      challengeId: "ch-dom-todo",
      code: "btn.addEventListener('click', function() {\n  if (!input.value) return;\n  const li = document.createElement('li');\n  li.textContent = input.value;\n  list.appendChild(li);\n  li.onclick = function() {\n    this.classList.toggle('completed');\n  };\n  input.value = '';\n});\n",
      date: "2026-06-26",
    },
  ];

  for (const s of bobC2Submissions) {
    batch.set(bob2.collection("challengeSubmissions").doc(s.id), {
      challengeId: s.challengeId,
      code: s.code,
      submittedAt: ts(new Date(`${s.date}T21:00:00Z`)),
    });
  }

  const bobC2CheckIns = [
    {
      id: "ci-bob-wd-0624",
      note: "Flatten worked but my helper function approach feels clunky. Saw that reduce can do it too — want to try that next.",
      date: "2026-06-24",
    },
    {
      id: "ci-bob-wd-0626",
      note: "DOM challenge took longer than expected. createElement and appendChild are not hard, just verbose. Got the toggle working.",
      date: "2026-06-26",
    },
    {
      id: "ci-bob-wd-0627",
      note: "Skipped the debounce challenge — closures still confuse me. Going to re-read the MDN article before attempting it.",
      date: TODAY,
    },
  ];

  for (const ci of bobC2CheckIns) {
    batch.set(bob2.collection("checkIns").doc(ci.id), {
      note: ci.note,
      courseId: COURSE2_ID,
      createdAt: ts(new Date(`${ci.date}T21:30:00Z`)),
    });
  }

  const bobC2Cards = [
    {
      id: "card-bob-wd-1",
      title: "Flatten nested arrays",
      description: "Try recursive helper, then refactor to reduce approach.",
      status: "DONE" as const,
      milestoneId: "sprint-1",
      movedDate: "2026-06-24",
    },
    {
      id: "card-bob-wd-2",
      title: "Understand closures",
      description:
        "Read MDN closures article and write 3 examples before tackling debounce.",
      status: "IN_PROGRESS" as const,
      milestoneId: "sprint-1",
      movedDate: "2026-06-25",
    },
    {
      id: "card-bob-wd-3",
      title: "DOM to-do list",
      description: "Basic add + toggle-complete. No delete needed yet.",
      status: "DONE" as const,
      milestoneId: "sprint-2",
      movedDate: "2026-06-26",
    },
    {
      id: "card-bob-wd-4",
      title: "Implement debounce",
      description: "After closures card is done, attempt the challenge again.",
      status: "TODO" as const,
      milestoneId: "sprint-1",
      movedDate: "2026-06-17",
    },
  ];

  for (const card of bobC2Cards) {
    batch.set(bob2.collection("sprintCards").doc(card.id), {
      title: card.title,
      description: card.description,
      status: card.status,
      isInstructorSeeded: false,
      milestoneId: card.milestoneId,
      createdAt: ts(day("2026-06-17")),
      updatedAt: ts(day(card.movedDate)),
      movedAt: ts(day(card.movedDate)),
    });
  }

  const bobC2StreakDays = [
    // gap: 2026-06-21, 2026-06-22, 2026-06-23 missing
    { date: "2026-06-24", challenge: true, checkin: true, sprintCard: true },
    // gap: 2026-06-25 missing
    { date: "2026-06-26", challenge: true, checkin: true, sprintCard: true },
    { date: TODAY, challenge: false, checkin: true, sprintCard: false },
  ];

  for (const entry of bobC2StreakDays) {
    batch.set(bob2.collection("streakEntries").doc(entry.date), {
      date: entry.date,
      sources: {
        challenge: entry.challenge,
        checkin: entry.checkin,
        sprintCard: entry.sprintCard,
      },
    });
  }

  batch.set(bob2.collection("journalEntries").doc("journal-bob-wd-1"), {
    content:
      "I got flatten working but I'm not happy with how I did it. My helper function mutates an outer array — it works, but it feels wrong. Seeing Alice's reduce approach made me realize I should read more about functional patterns before just reaching for loops.",
    createdAt: ts(new Date("2026-06-24T21:15:00Z")),
    triggerType: "CHALLENGE",
  });

  // ── Commit ──────────────────────────────────────────────────────────────────
  await batch.commit();
  console.log("✓ Seed complete.");
  console.log(`  Course 1:     ${COURSE1_ID}`);
  console.log(`  Course 2:     ${COURSE2_ID}`);
  console.log(`  Instructor:   ${INSTRUCTOR_UID}`);
  console.log(`  Student 1:    ${STUDENT1_UID} (Alice)`);
  console.log(`  Student 2:    ${STUDENT2_UID} (Bob)`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
