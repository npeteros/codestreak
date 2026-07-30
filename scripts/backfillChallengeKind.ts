/**
 * Backfill script — stamps kind:"DAILY" onto every pre-existing ChallengeDoc
 * that predates the ChallengeKind field.
 *
 * Why this is mandatory before the Challenges module ships: getScheduledChallenge
 * (lib/repositories/challenges.ts) is about to gain a `.where("kind","==","DAILY")`
 * clause so newly-added practice challenges can't collide with the "today's
 * challenge" query. Firestore's equality/inequality filters exclude documents
 * where the field is absent entirely, so any ChallengeDoc missing `kind` would
 * silently stop matching that query the moment the filter ships — this script
 * closes that gap. Idempotent: re-running finds zero remaining matches.
 *
 * Usage:
 *   npm run backfill:challenge-kind
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
  const snap = await db.collectionGroup("challenges").get();
  const missingKind = snap.docs.filter((doc) => doc.data().kind === undefined);

  console.log(`Found ${snap.size} challenge doc(s) total, ${missingKind.length} missing "kind".`);

  if (missingKind.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  for (let i = 0; i < missingKind.length; i += BATCH_SIZE) {
    const chunk = missingKind.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.update(doc.ref, { kind: "DAILY" });
    }
    await batch.commit();
    console.log(`Backfilled ${Math.min(i + BATCH_SIZE, missingKind.length)}/${missingKind.length}.`);
  }

  console.log("Backfill complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
