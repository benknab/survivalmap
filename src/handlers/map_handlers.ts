import type { Context } from "fresh";
import { h } from "preact";
import * as z from "zod";
import type { AddUserFieldErrors } from "../components/forms/user_forms.tsx";
import {
  MapNotFoundPage,
  MapPage,
  type MapPageProps,
  UserSelectPage,
  type UserSelectPageProps,
} from "../components/pages/mod.ts";
import { type FieldIssueError, getFieldIssue } from "../http/field_errors.ts";
import { getFormString } from "../http/forms.ts";
import { logInfo } from "../http/logging.ts";
import { setCurrentUserCookie } from "../http/session_cookie.ts";
import { getMap } from "../services/map_service.ts";
import { addUser, getCurrentUser, getUsersForMap } from "../services/user_service.ts";

const nicknameSchema = z.string()
  .trim()
  .min(1, "Nickname is required.")
  .max(60, "Nickname must be 60 characters or fewer.");

const chooseUserSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const addUserSchema = z.object({
  nickname: nicknameSchema,
});

export async function getMapPage(ctx: Context<unknown>): Promise<Response> {
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
}

export async function postMapSession(ctx: Context<unknown>): Promise<Response> {
  const map = await getMap(ctx.params.id);

  if (!map) {
    return ctx.render(h(MapNotFoundPage, {}), { status: 404 });
  }

  const possibleUsers = await getUsersForMap(map.id);
  const form = await ctx.req.formData();
  const result = chooseUserSchema.safeParse({ userId: getFormString(form.get("userId")) });
  const user = result.success
    ? possibleUsers.find((possibleUser) => possibleUser.id === result.data.userId)
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
}

export async function postMapUser(ctx: Context<unknown>): Promise<Response> {
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
}

function getAddUserFieldErrors(error: FieldIssueError): AddUserFieldErrors {
  return {
    nickname: getFieldIssue(error, "nickname"),
  };
}
