import { Op } from "sequelize";
import { User } from "@/lib/db/models";
import type { UserDoc, UserRole } from "@/lib/types";

function toUserDoc(row: User): UserDoc {
  return {
    uid: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt,
  };
}

export async function getUser(uid: string): Promise<UserDoc | null> {
  const row = await User.findOne({ where: { id: uid, deleted: false } });
  return row ? toUserDoc(row) : null;
}

// Batched read across many uids — one round trip instead of N.
export async function getUsers(uids: string[]): Promise<Map<string, UserDoc>> {
  const result = new Map<string, UserDoc>();
  if (uids.length === 0) return result;

  const rows = await User.findAll({ where: { id: { [Op.in]: uids }, deleted: false } });
  for (const row of rows) result.set(row.id, toUserDoc(row));
  return result;
}

// Auth-only lookup — includes the password hash.
export async function getUserByEmail(
  email: string
): Promise<(UserDoc & { passwordHash: string }) | null> {
  const row = await User.findOne({ where: { email: email.toLowerCase(), deleted: false } });
  return row ? { ...toUserDoc(row), passwordHash: row.passwordHash } : null;
}

export async function createUser(
  id: string,
  data: { email: string; name: string; role: UserRole; passwordHash: string }
): Promise<void> {
  await User.create({
    id,
    email: data.email.toLowerCase(),
    name: data.name,
    role: data.role,
    passwordHash: data.passwordHash,
  });
}
