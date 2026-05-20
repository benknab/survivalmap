import { and, eq } from "drizzle-orm";
import { db } from "../db.ts";
import { point, type PointRecord, type UserRecord } from "../schema.ts";
import { getUserForMap, getUsersForMap } from "./user_service.ts";

export type AddPointInput = {
  name: string;
  emoji: string;
  color: string;
  x: number;
  y: number;
  z: number;
};

export type UpdatePointInput = Partial<Pick<AddPointInput, "name" | "emoji" | "color">> & {
  deleted?: boolean;
};

export type PointResponse = PointRecord & { addedByNickname: string };

export async function addPoint(
  mapId: string,
  userId: number,
  input: AddPointInput,
): Promise<PointRecord> {
  return await db.insert(point).values({
    mapId,
    name: input.name,
    emoji: input.emoji,
    color: input.color,
    x: input.x,
    y: input.y,
    z: input.z,
    addedByUserId: userId,
  }).returning().get();
}

export async function updatePoint(
  mapId: string,
  pointId: number,
  input: UpdatePointInput,
): Promise<PointRecord | undefined> {
  const values: Partial<Pick<PointRecord, "deletedAt" | "name" | "emoji" | "color">> = {};

  if (input.deleted !== undefined) {
    values.deletedAt = input.deleted ? new Date().toISOString() : null;
  }

  if (input.name !== undefined) {
    values.name = input.name;
  }

  if (input.emoji !== undefined) {
    values.emoji = input.emoji;
  }

  if (input.color !== undefined) {
    values.color = input.color;
  }

  return await db.update(point).set(values).where(
    and(eq(point.mapId, mapId), eq(point.id, pointId)),
  ).returning().get();
}

export async function getPointResponsesForMap(mapId: string): Promise<PointResponse[]> {
  const [pointRows, userRows] = await Promise.all([getPointsForMap(mapId), getUsersForMap(mapId)]);
  const usersById = new Map(userRows.map((user) => [user.id, user]));

  return pointRows.map((pointRow) =>
    getPointResponse(pointRow, usersById.get(pointRow.addedByUserId))
  );
}

export async function getPointAddedByUser(
  mapId: string,
  pointRow: PointRecord,
): Promise<UserRecord | undefined> {
  return await getUserForMap(mapId, pointRow.addedByUserId);
}

export function getPointResponse(
  pointRow: PointRecord,
  addedByUser?: UserRecord,
): PointResponse {
  return {
    ...pointRow,
    addedByNickname: addedByUser?.nickname ?? "Unknown",
  };
}

async function getPointsForMap(mapId: string): Promise<PointRecord[]> {
  const pointRows = await db.select().from(point).where(eq(point.mapId, mapId)).all();
  return [...pointRows].sort((left, right) => left.id - right.id);
}
