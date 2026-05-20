import type { Context } from "fresh";
import { h } from "preact";
import * as z from "zod";
import type { CreateMapFieldErrors, JoinMapFieldErrors } from "../components/forms/map_forms.tsx";
import { HomePage, type HomePageProps } from "../components/pages/mod.ts";
import { type FieldIssueError, getFieldIssue } from "../http/field_errors.ts";
import { getFormString } from "../http/forms.ts";
import { logInfo } from "../http/logging.ts";
import { setCurrentUserCookie } from "../http/session_cookie.ts";
import { createMap, getCurrentMaps, getMap } from "../services/map_service.ts";

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

export async function getHomePage(ctx: Context<unknown>): Promise<Response> {
  return ctx.render(h<HomePageProps>(HomePage, await getHomePageProps(ctx.req.headers)));
}

export async function postCreateMap(ctx: Context<unknown>): Promise<Response> {
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
}

export async function postJoinMap(ctx: Context<unknown>): Promise<Response> {
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

function getCreateMapFieldErrors(error: FieldIssueError): CreateMapFieldErrors {
  return {
    name: getFieldIssue(error, "name"),
    nickname: getFieldIssue(error, "nickname"),
  };
}

function getJoinMapFieldErrors(error: FieldIssueError): JoinMapFieldErrors {
  return {
    id: getFieldIssue(error, "id"),
  };
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
