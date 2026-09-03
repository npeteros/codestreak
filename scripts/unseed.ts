/**
 * Unseed script — removes everything scripts/seed.ts creates.
 *
 * Deleting the two seed users cascades through everything scoped to them.
 *
 * Usage:
 *   npm run unseed
 */

import { User } from "../lib/db/models";

const INSTRUCTOR_UID = process.env.SEED_INSTRUCTOR_UID ?? "00000000-0000-4000-8000-000000000001";
const STUDENT_UID = process.env.SEED_STUDENT_UID ?? "00000000-0000-4000-8000-000000000002";

async function unseed() {
  const removed = await User.destroy({ where: { id: [INSTRUCTOR_UID, STUDENT_UID] } });

  if (removed === 0) {
    console.log("Nothing to remove — seed users do not exist.");
    return;
  }

  console.log("✓ Unseed complete.");
  console.log(`  Removed ${removed} seed user(s) and everything cascaded from them.`);
}

unseed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Unseed failed:", err);
    process.exit(1);
  });
