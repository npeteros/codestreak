/**
 * Backfill script — stamps streakRules.practice:true onto every pre-existing
 * CourseDoc that predates the Practice streak source.
 *
 * Why: Practice was just consolidated into the shared streak system as a 4th
 * source (alongside challenge/checkin/sprintCard), gated by a per-course
 * streakRules.practice toggle just like the other three. Existing CourseDocs
 * only have {challenge, checkin, sprintCard} in their streakRules map, so
 * `course.streakRules.practice` would read as `undefined` (falsy) at runtime
 * despite the type declaring it as a required boolean — which would silently
 * disable Practice's contribution to the streak for every already-existing
 * course until an instructor happened to open Settings and re-save the
 * toggles. This script closes that gap by defaulting existing courses to
 * enabled, matching the default given to newly-created courses. Idempotent:
 * re-running finds zero remaining matches.
 *
 * Usage:
 *   npm run backfill:streak-rules-practice
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);

const BATCH_SIZE = 500; // Firestore batch write limit

async function main() {
  const snap = await db.collection("courses").get();
  const missingPractice = snap.docs.filter(
    (doc) => doc.data().streakRules?.practice === undefined
  );

  console.log(`Found ${snap.size} course doc(s) total, ${missingPractice.length} missing streakRules.practice.`);

  if (missingPractice.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  for (let i = 0; i < missingPractice.length; i += BATCH_SIZE) {
    const chunk = missingPractice.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.update(doc.ref, { "streakRules.practice": true });
    }
    await batch.commit();
    console.log(`Backfilled ${Math.min(i + BATCH_SIZE, missingPractice.length)}/${missingPractice.length}.`);
  }

  console.log("Backfill complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
