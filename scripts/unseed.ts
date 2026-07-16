/**
 * Unseed script — removes everything scripts/seed.ts creates.
 *
 * Mirrors lib/repositories/courses.ts::deleteCourseCascade: recursively
 * deletes each enrolled student's hub doc (students/{uid}/courses/{courseId},
 * which cascades streakEntries, checkIns, challengeSubmissions, sprintCards,
 * journalEntries) before recursively deleting the course itself (which
 * cascades enrollments, challenges, milestones, and projects — including
 * each project's nested studentBoards/{studentId}/tasks).
 *
 * Ensure .env contains valid FIREBASE_ADMIN_* credentials.
 *
 * Usage:
 *   npm run unseed
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const COURSE_ID = "cs201-data-structures";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);

async function unseed() {
  const courseRef = db.collection("courses").doc(COURSE_ID);

  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) {
    console.log(`Nothing to remove — course ${COURSE_ID} does not exist.`);
    return;
  }

  const enrollmentsSnap = await courseRef.collection("enrollments").get();

  await Promise.all(
    enrollmentsSnap.docs.map((doc) =>
      db.recursiveDelete(
        db.collection("students").doc(doc.id).collection("courses").doc(COURSE_ID)
      )
    )
  );

  await db.recursiveDelete(courseRef);

  console.log("✓ Unseed complete.");
  console.log(`  Removed course:              ${COURSE_ID}`);
  console.log(`  Removed hub docs for:        ${enrollmentsSnap.size} enrolled student(s)`);
}

unseed().catch((err) => {
  console.error("Unseed failed:", err);
  process.exit(1);
});
