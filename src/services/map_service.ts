import { eq } from "drizzle-orm";
import { db } from "../db.ts";
import { getUserCookieSelections } from "../http/session_cookie.ts";
import type { CurrentMap } from "../models/current_map.ts";
import { type MapRecord, maps, type UserRecord, users } from "../schema.ts";
import { getUserForMap } from "./user_service.ts";

export type CreateMapInput = {
  name: string;
  nickname: string;
};

export async function getCurrentMaps(headers: Headers): Promise<CurrentMap[]> {
  const selections = getUserCookieSelections(headers);
  const currentMaps = await Promise.all(
    Object.entries(selections).map(async ([mapId, userId]): Promise<CurrentMap | null> => {
      const [map, user] = await Promise.all([getMap(mapId), getUserForMap(mapId, userId)]);

      if (!map || !user) {
        return null;
      }

      return {
        id: map.id,
        name: map.name,
        userNickname: user.nickname,
      };
    }),
  );

  return currentMaps.filter((map): map is CurrentMap => map !== null);
}

export async function createMap(
  input: CreateMapInput,
): Promise<{ map: MapRecord; user: UserRecord }> {
  const map: MapRecord = {
    id: crypto.randomUUID(),
    name: input.name,
  };

  const user = await db.transaction(async (tx): Promise<UserRecord> => {
    await tx.insert(maps).values(map);

    return await tx.insert(users).values({
      mapId: map.id,
      nickname: input.nickname,
    }).returning().get();
  });

  return { map, user };
}

export async function getMap(id: string): Promise<MapRecord | undefined> {
  return await db.select().from(maps).where(eq(maps.id, id)).get();
}
