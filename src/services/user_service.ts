import { and, eq } from "drizzle-orm";
import { db } from "../db.ts";
import { getCurrentUserId } from "../http/session_cookie.ts";
import { type UserRecord, users } from "../schema.ts";

export type AddUserInput = {
  nickname: string;
};

export async function addUser(mapId: string, input: AddUserInput): Promise<UserRecord> {
  return await db.insert(users).values({
    mapId,
    nickname: input.nickname,
  }).returning().get();
}

export async function getUsersForMap(mapId: string): Promise<UserRecord[]> {
  const userRows = await db.select().from(users).where(eq(users.mapId, mapId)).all();
  return [...userRows].sort(compareUsers);
}

export async function getUserForMap(
  mapId: string,
  userId: number,
): Promise<UserRecord | undefined> {
  return await db.select().from(users).where(
    and(eq(users.mapId, mapId), eq(users.id, userId)),
  ).get();
}

export async function getCurrentUser(
  headers: Headers,
  mapId: string,
): Promise<UserRecord | undefined> {
  const userId = getCurrentUserId(headers, mapId);

  if (userId === undefined) {
    return undefined;
  }

  return await getUserForMap(mapId, userId);
}

function compareUsers(left: UserRecord, right: UserRecord): number {
  return left.nickname.localeCompare(right.nickname) || left.id - right.id;
}
