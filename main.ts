import { and, eq } from "drizzle-orm";
import { App, staticFiles } from "fresh";
import { h } from "preact";
import * as z from "zod";
import { AppWrapper } from "./components/app_wrapper.tsx";
import {
  type CurrentMap,
  ErrorPage,
  HomePage,
  type HomePageProps,
  MapNotFoundPage,
  MapPage,
  type MapPageProps,
  UserSelectPage,
  type UserSelectPageProps,
} from "./components/pages.tsx";
import type {
  AddUserFieldErrors,
  CreateMapFieldErrors,
  JoinMapFieldErrors,
} from "./components/ui.tsx";
import { db } from "./src/db.ts";
import { type MapRecord, maps, type UserRecord, users } from "./src/schema.ts";

const userCookieName = "survivalmap_users";
const userCookieMaxAgeSeconds = 60 * 60 * 24 * 365 * 20;

const nicknameSchema = z.string()
  .trim()
  .min(1, "Nickname is required.")
  .max(60, "Nickname must be 60 characters or fewer.");

const createMapSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required.")
    .max(80, "Name must be 80 characters or fewer."),
  nickname: nicknameSchema,
});

const joinMapSchema = z.object({
  id: z.string()
    .trim()
    .min(1, "Map ID is required.")
    .max(240, "Map ID or URL is too long.")
    .transform(getMapIdFromInput)
    .pipe(z.string().min(1, "Map ID is required.").max(120, "Map ID is too long.")),
});

const chooseUserSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const addUserSchema = z.object({
  nickname: nicknameSchema,
});

type CreateMapInput = z.infer<typeof createMapSchema>;
type AddUserInput = z.infer<typeof addUserSchema>;

export const app = new App()
  .use(staticFiles())
  .appWrapper(AppWrapper)
  .onError("*", (ctx) => ctx.render(h(ErrorPage, {}), { status: 500 }))
  .get("/", async (ctx) => {
    return ctx.render(h<HomePageProps>(HomePage, await getHomePageProps(ctx.req.headers)));
  })
  .get("/index.html", async (ctx) => {
    return ctx.render(h<HomePageProps>(HomePage, await getHomePageProps(ctx.req.headers)));
  })
  .get("/map", (ctx) => ctx.redirect("/", 303))
  .post("/map", async (ctx) => {
    const form = await ctx.req.formData();
    const result = createMapSchema.safeParse({
      name: getFormString(form.get("name")),
      nickname: getFormString(form.get("nickname")),
    });

    if (!result.success) {
      return ctx.render(
        h<HomePageProps>(
          HomePage,
          await getHomePageProps(ctx.req.headers, {
            createMapError: "Map input is invalid.",
            createMapFieldErrors: getCreateMapFieldErrors(result.error),
          }),
        ),
        { status: 400 },
      );
    }

    const { map, user } = await createMap(result.data);
    const response = ctx.redirect(`/map/${map.id}`, 303);
    setCurrentUserCookie(response.headers, ctx.req.headers, map.id, user.id);
    return response;
  })
  .post("/map/join", async (ctx) => {
    const form = await ctx.req.formData();
    const result = joinMapSchema.safeParse({ id: getFormString(form.get("id")) });

    if (!result.success) {
      return ctx.render(
        h<HomePageProps>(
          HomePage,
          await getHomePageProps(ctx.req.headers, {
            joinMapError: "Map input is invalid.",
            joinMapFieldErrors: getJoinMapFieldErrors(result.error),
          }),
        ),
        { status: 400 },
      );
    }

    const map = await getMap(result.data.id);

    if (!map) {
      return ctx.render(
        h<HomePageProps>(
          HomePage,
          await getHomePageProps(ctx.req.headers, { joinMapError: "No map exists for that ID." }),
        ),
        { status: 404 },
      );
    }

    return ctx.redirect(`/map/${map.id}`, 303);
  })
  .get("/map/:id", async (ctx) => {
    const map = await getMap(ctx.params.id);

    if (!map) {
      return ctx.render(h(MapNotFoundPage, {}), { status: 404 });
    }

    const possibleUsers = await getUsersForMap(map.id);
    const currentUser = await getCurrentUser(ctx.req.headers, map.id);

    if (!currentUser) {
      return ctx.render(h<UserSelectPageProps>(UserSelectPage, { map, users: possibleUsers }));
    }

    return ctx.render(h<MapPageProps>(MapPage, { map, currentUser, users: possibleUsers }));
  })
  .post("/map/:id/session", async (ctx) => {
    const map = await getMap(ctx.params.id);

    if (!map) {
      return ctx.render(h(MapNotFoundPage, {}), { status: 404 });
    }

    const possibleUsers = await getUsersForMap(map.id);
    const form = await ctx.req.formData();
    const result = chooseUserSchema.safeParse({ userId: getFormString(form.get("userId")) });
    const user = result.success
      ? possibleUsers.find((user) => user.id === result.data.userId)
      : undefined;

    if (!user) {
      return ctx.render(
        h<UserSelectPageProps>(UserSelectPage, {
          map,
          users: possibleUsers,
          error: "Choose one of the listed nicknames.",
        }),
        { status: 400 },
      );
    }

    const response = ctx.redirect(`/map/${map.id}`, 303);
    setCurrentUserCookie(response.headers, ctx.req.headers, map.id, user.id);
    return response;
  })
  .post("/map/:id/users", async (ctx) => {
    const map = await getMap(ctx.params.id);

    if (!map) {
      return ctx.render(h(MapNotFoundPage, {}), { status: 404 });
    }

    const possibleUsers = await getUsersForMap(map.id);
    const currentUser = await getCurrentUser(ctx.req.headers, map.id);

    if (!currentUser) {
      return ctx.render(
        h<UserSelectPageProps>(UserSelectPage, {
          map,
          users: possibleUsers,
          error: "Choose who you are before adding people.",
        }),
        { status: 401 },
      );
    }

    const form = await ctx.req.formData();
    const result = addUserSchema.safeParse({ nickname: getFormString(form.get("nickname")) });

    if (!result.success) {
      return ctx.render(
        h<MapPageProps>(MapPage, {
          map,
          currentUser,
          users: possibleUsers,
          addUserError: "Person input is invalid.",
          addUserFieldErrors: getAddUserFieldErrors(result.error),
        }),
        { status: 400 },
      );
    }

    if (possibleUsers.some((user) => user.nickname === result.data.nickname)) {
      return ctx.render(
        h<MapPageProps>(MapPage, {
          map,
          currentUser,
          users: possibleUsers,
          addUserError: "That nickname is already on this map.",
          addUserFieldErrors: { nickname: "Choose a different nickname." },
        }),
        { status: 409 },
      );
    }

    await addUser(map.id, result.data);
    return ctx.redirect(`/map/${map.id}`, 303);
  })
  .notFound((ctx) => ctx.render(h(MapNotFoundPage, {}), { status: 404 }));

async function getHomePageProps(
  headers: Headers,
  props: Omit<HomePageProps, "currentMaps"> = {},
): Promise<HomePageProps> {
  return {
    ...props,
    currentMaps: await getCurrentMaps(headers),
  };
}

async function getCurrentMaps(headers: Headers): Promise<CurrentMap[]> {
  const selections = getUserCookieSelections(headers);
  const currentMaps: CurrentMap[] = [];

  for (const [mapId, userId] of Object.entries(selections)) {
    const map = await getMap(mapId);
    const user = await getUserForMap(mapId, userId);

    if (!map || !user) {
      continue;
    }

    currentMaps.push({
      id: map.id,
      name: map.name,
      userNickname: user.nickname,
    });
  }

  return currentMaps;
}

async function createMap(
  input: CreateMapInput,
): Promise<{ map: MapRecord; user: UserRecord }> {
  const map: MapRecord = {
    id: crypto.randomUUID(),
    name: input.name,
  };

  const user = await db.transaction(async (tx) => {
    await tx.insert(maps).values(map);

    return await tx.insert(users).values({
      mapId: map.id,
      nickname: input.nickname,
    }).returning().get();
  });

  return { map, user };
}

async function addUser(mapId: string, input: AddUserInput): Promise<UserRecord> {
  return await db.insert(users).values({
    mapId,
    nickname: input.nickname,
  }).returning().get();
}

async function getMap(id: string): Promise<MapRecord | undefined> {
  return await db.select().from(maps).where(eq(maps.id, id)).get();
}

async function getUsersForMap(mapId: string): Promise<UserRecord[]> {
  const userRows = await db.select().from(users).where(eq(users.mapId, mapId)).all();
  return [...userRows].sort(compareUsers);
}

async function getUserForMap(mapId: string, userId: number): Promise<UserRecord | undefined> {
  return await db.select().from(users).where(
    and(eq(users.mapId, mapId), eq(users.id, userId)),
  ).get();
}

async function getCurrentUser(
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

function getFormString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function getCreateMapFieldErrors(
  error: { issues: readonly { path: readonly unknown[]; message: string }[] },
): CreateMapFieldErrors {
  return {
    name: getFieldIssue(error, "name"),
    nickname: getFieldIssue(error, "nickname"),
  };
}

function getJoinMapFieldErrors(
  error: { issues: readonly { path: readonly unknown[]; message: string }[] },
): JoinMapFieldErrors {
  return {
    id: getFieldIssue(error, "id"),
  };
}

function getAddUserFieldErrors(
  error: { issues: readonly { path: readonly unknown[]; message: string }[] },
): AddUserFieldErrors {
  return {
    nickname: getFieldIssue(error, "nickname"),
  };
}

function getFieldIssue(
  error: { issues: readonly { path: readonly unknown[]; message: string }[] },
  field: string,
): string | undefined {
  return error.issues.find((issue) => issue.path[0] === field)?.message;
}

function getMapIdFromInput(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  try {
    return getMapIdFromPath(new URL(trimmed).pathname);
  } catch {
    return getMapIdFromPath(trimmed);
  }
}

function getMapIdFromPath(input: string): string {
  const [withoutQuery = ""] = input.split(/[?#]/, 1);
  const withoutPrefix = withoutQuery.startsWith("/map/")
    ? withoutQuery.slice("/map/".length)
    : withoutQuery.startsWith("map/")
    ? withoutQuery.slice("map/".length)
    : withoutQuery;
  const [segment = ""] = withoutPrefix.split("/", 1);

  try {
    return decodeURIComponent(segment).trim();
  } catch {
    return segment.trim();
  }
}

function getCurrentUserId(headers: Headers, mapId: string): number | undefined {
  return getUserCookieSelections(headers)[mapId];
}

function setCurrentUserCookie(
  responseHeaders: Headers,
  requestHeaders: Headers,
  mapId: string,
  userId: number,
): void {
  const selections = getUserCookieSelections(requestHeaders);
  selections[mapId] = userId;
  const expires = new Date(Date.now() + userCookieMaxAgeSeconds * 1000);

  responseHeaders.append(
    "Set-Cookie",
    `${userCookieName}=${
      encodeURIComponent(formatUserCookieSelections(selections))
    }; Path=/; Max-Age=${userCookieMaxAgeSeconds}; Expires=${expires.toUTCString()}; SameSite=Lax; HttpOnly`,
  );
}

function getUserCookieSelections(headers: Headers): Record<string, number> {
  const value = getCookie(headers, userCookieName);

  if (!value) {
    return {};
  }

  const selections: Record<string, number> = {};

  for (const pair of value.split("|")) {
    const separatorIndex = pair.lastIndexOf(":");

    if (separatorIndex < 1) {
      continue;
    }

    const mapId = pair.slice(0, separatorIndex);
    const userId = Number(pair.slice(separatorIndex + 1));

    if (mapId && Number.isSafeInteger(userId) && userId > 0) {
      selections[mapId] = userId;
    }
  }

  return selections;
}

function formatUserCookieSelections(selections: Record<string, number>): string {
  return Object.entries(selections)
    .map(([mapId, userId]) => `${mapId}:${userId}`)
    .join("|");
}

function getCookie(headers: Headers, name: string): string | undefined {
  const cookieHeader = headers.get("cookie");

  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName = "", ...valueParts] = cookie.trim().split("=");

    if (rawName !== name || valueParts.length === 0) {
      continue;
    }

    const value = valueParts.join("=");

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}
