import { and, eq } from "drizzle-orm";
import { App, type Context, staticFiles } from "fresh";
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
import { db } from "./db.ts";
import { pointColorValues, pointEmojiValues } from "./point_style.ts";
import { type MapRecord, maps, point, type PointRecord, type UserRecord, users } from "./schema.ts";

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

const pointCoordinateSchema = z.number()
  .finite("Coordinate must be a finite number.")
  .min(-1_000_000, "Coordinate is too small.")
  .max(1_000_000, "Coordinate is too large.");

const addPointSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Point name is required.")
    .max(80, "Point name must be 80 characters or fewer."),
  emoji: z.enum(pointEmojiValues),
  color: z.enum(pointColorValues),
  x: pointCoordinateSchema,
  y: pointCoordinateSchema,
  z: pointCoordinateSchema,
});

const pointIdSchema = z.coerce.number().int().positive();

const updatePointSchema = z.object({
  deleted: z.boolean().optional(),
  name: z.string()
    .trim()
    .min(1, "Point name is required.")
    .max(80, "Point name must be 80 characters or fewer.")
    .optional(),
  emoji: z.enum(pointEmojiValues).optional(),
  color: z.enum(pointColorValues).optional(),
}).refine(
  (input) =>
    input.deleted !== undefined || input.name !== undefined || input.emoji !== undefined ||
    input.color !== undefined,
  "Point update is empty.",
);

type CreateMapInput = z.infer<typeof createMapSchema>;
type AddUserInput = z.infer<typeof addUserSchema>;
type AddPointInput = z.infer<typeof addPointSchema>;
type UpdatePointInput = z.infer<typeof updatePointSchema>;
type PointResponse = PointRecord & { addedByNickname: string };

export const app = new App()
  .use(staticFiles())
  .use(logRequest)
  .appWrapper(AppWrapper)
  .onError("*", (ctx) => {
    logError("request_error", getRequestLogContext(ctx, { error: getErrorLog(ctx.error) }));

    if (isPointApiRequest(ctx.req)) {
      return Response.json({ error: "Unexpected point server error." }, { status: 500 });
    }

    return ctx.render(h(ErrorPage, {}), { status: 500 });
  })
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
    logInfo("map_created", { mapId: map.id, userId: user.id });

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
  .get("/map/:id/points", async (ctx) => {
    const map = await getMap(ctx.params.id);

    if (!map) {
      return Response.json({ error: "Map not found." }, { status: 404 });
    }

    return Response.json({ points: await getPointResponsesForMap(map.id) });
  })
  .post("/map/:id/points", async (ctx) => {
    const map = await getMap(ctx.params.id);

    if (!map) {
      return Response.json({ error: "Map not found." }, { status: 404 });
    }

    const currentUser = await getCurrentUser(ctx.req.headers, map.id);

    if (!currentUser) {
      return Response.json({ error: "Choose who you are before adding points." }, { status: 401 });
    }

    const body = await getJsonBody(ctx.req);
    const result = addPointSchema.safeParse(body);

    if (!result.success) {
      return Response.json({ error: "Point input is invalid." }, { status: 400 });
    }

    const pointRow = await addPoint(map.id, currentUser.id, result.data);
    logInfo("point_added", { mapId: map.id, pointId: pointRow.id, userId: currentUser.id });

    return Response.json({ point: getPointResponse(pointRow, currentUser) }, { status: 201 });
  })
  .patch("/map/:id/points/:pointId", async (ctx) => {
    const map = await getMap(ctx.params.id);

    if (!map) {
      return Response.json({ error: "Map not found." }, { status: 404 });
    }

    const currentUser = await getCurrentUser(ctx.req.headers, map.id);

    if (!currentUser) {
      return Response.json({ error: "Choose who you are before changing points." }, {
        status: 401,
      });
    }

    const pointIdResult = pointIdSchema.safeParse(ctx.params.pointId);

    if (!pointIdResult.success) {
      return Response.json({ error: "Point not found." }, { status: 404 });
    }

    const body = await getJsonBody(ctx.req);
    const result = updatePointSchema.safeParse(body);

    if (!result.success) {
      return Response.json({ error: "Point update is invalid." }, { status: 400 });
    }

    const pointRow = await updatePoint(map.id, pointIdResult.data, result.data);

    if (!pointRow) {
      return Response.json({ error: "Point not found." }, { status: 404 });
    }

    const addedByUser = await getUserForMap(map.id, pointRow.addedByUserId);
    if (!addedByUser) {
      logWarn("point_user_missing", {
        mapId: map.id,
        pointId: pointRow.id,
        addedByUserId: pointRow.addedByUserId,
      });
    }

    logInfo("point_updated", {
      mapId: map.id,
      pointId: pointRow.id,
      userId: currentUser.id,
      fields: getPointUpdateFields(result.data),
    });

    return Response.json({ point: getPointResponse(pointRow, addedByUser) });
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

    const user = await addUser(map.id, result.data);
    logInfo("user_added", { mapId: map.id, userId: user.id, addedByUserId: currentUser.id });

    return ctx.redirect(`/map/${map.id}`, 303);
  })
  .notFound((ctx) => ctx.render(h(MapNotFoundPage, {}), { status: 404 }));

type LogValue = string | number | boolean | null | undefined | LogValue[] | {
  [key: string]: LogValue;
};
type LogContext = Record<string, LogValue>;
type LogLevel = "info" | "warn" | "error";

async function logRequest(ctx: Context<unknown>): Promise<Response> {
  const startedAt = performance.now();

  try {
    const response = await ctx.next();
    const context = getRequestLogContext(ctx, {
      status: response.status,
      durationMs: getDurationMs(startedAt),
    });

    if (response.status >= 500) {
      logError("request", context);
    } else if (response.status >= 400) {
      logWarn("request", context);
    } else {
      logInfo("request", context);
    }

    return response;
  } catch (error) {
    logError(
      "request_unhandled_error",
      getRequestLogContext(ctx, {
        durationMs: getDurationMs(startedAt),
        error: getErrorLog(error),
      }),
    );
    throw error;
  }
}

function getRequestLogContext(ctx: Context<unknown>, context: LogContext = {}): LogContext {
  return {
    method: ctx.req.method,
    path: ctx.url.pathname,
    route: ctx.route ?? undefined,
    ...context,
  };
}

function getDurationMs(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

function logInfo(event: string, context: LogContext = {}): void {
  writeLog("info", event, context);
}

function logWarn(event: string, context: LogContext = {}): void {
  writeLog("warn", event, context);
}

function logError(event: string, context: LogContext = {}): void {
  writeLog("error", event, context);
}

function writeLog(level: LogLevel, event: string, context: LogContext): void {
  const message = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    ...context,
  });

  if (level === "error") {
    console.error(message);
  } else if (level === "warn") {
    console.warn(message);
  } else {
    console.info(message);
  }
}

function getErrorLog(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function getPointUpdateFields(input: UpdatePointInput): string[] {
  const fields: string[] = [];

  if (input.deleted !== undefined) {
    fields.push(input.deleted ? "deleted" : "restored");
  }

  if (input.name !== undefined) {
    fields.push("name");
  }

  if (input.emoji !== undefined) {
    fields.push("emoji");
  }

  if (input.color !== undefined) {
    fields.push("color");
  }

  return fields;
}

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

async function addPoint(
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

async function updatePoint(
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
  )
    .returning().get();
}

async function getMap(id: string): Promise<MapRecord | undefined> {
  return await db.select().from(maps).where(eq(maps.id, id)).get();
}

async function getUsersForMap(mapId: string): Promise<UserRecord[]> {
  const userRows = await db.select().from(users).where(eq(users.mapId, mapId)).all();
  return [...userRows].sort(compareUsers);
}

async function getPointsForMap(mapId: string): Promise<PointRecord[]> {
  const pointRows = await db.select().from(point).where(eq(point.mapId, mapId)).all();
  return [...pointRows].sort((left, right) => left.id - right.id);
}

async function getPointResponsesForMap(mapId: string): Promise<PointResponse[]> {
  const [pointRows, userRows] = await Promise.all([getPointsForMap(mapId), getUsersForMap(mapId)]);
  const usersById = new Map(userRows.map((user) => [user.id, user]));

  return pointRows.map((pointRow) =>
    getPointResponse(pointRow, usersById.get(pointRow.addedByUserId))
  );
}

function getPointResponse(pointRow: PointRecord, addedByUser?: UserRecord): PointResponse {
  return {
    ...pointRow,
    addedByNickname: addedByUser?.nickname ?? "Unknown",
  };
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

function isPointApiRequest(request: Request): boolean {
  return new URL(request.url).pathname.includes("/points");
}

async function getJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
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
