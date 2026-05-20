import type { Context } from "fresh";
import * as z from "zod";
import { logInfo, logWarn } from "../http/logging.ts";
import { getJsonBody } from "../http/requests.ts";
import { pointColorValues, pointEmojiValues } from "../point_style.ts";
import { getMap } from "../services/map_service.ts";
import {
  addPoint,
  getPointAddedByUser,
  getPointResponse,
  getPointResponsesForMap,
  updatePoint,
  type UpdatePointInput,
} from "../services/point_service.ts";
import { getCurrentUser } from "../services/user_service.ts";

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
  (input): boolean =>
    input.deleted !== undefined || input.name !== undefined || input.emoji !== undefined ||
    input.color !== undefined,
  "Point update is empty.",
);

export async function getMapPoints(ctx: Context<unknown>): Promise<Response> {
  const map = await getMap(ctx.params.id);

  if (!map) {
    return Response.json({ error: "Map not found." }, { status: 404 });
  }

  return Response.json({ points: await getPointResponsesForMap(map.id) });
}

export async function postMapPoint(ctx: Context<unknown>): Promise<Response> {
  const map = await getMap(ctx.params.id);

  if (!map) {
    return Response.json({ error: "Map not found." }, { status: 404 });
  }

  const currentUser = await getCurrentUser(ctx.req.headers, map.id);

  if (!currentUser) {
    return Response.json({ error: "Choose who you are before adding points." }, { status: 401 });
  }

  const result = addPointSchema.safeParse(await getJsonBody(ctx.req));

  if (!result.success) {
    return Response.json({ error: "Point input is invalid." }, { status: 400 });
  }

  const pointRow = await addPoint(map.id, currentUser.id, result.data);
  logInfo("point_added", { mapId: map.id, pointId: pointRow.id, userId: currentUser.id });

  return Response.json({ point: getPointResponse(pointRow, currentUser) }, { status: 201 });
}

export async function patchMapPoint(ctx: Context<unknown>): Promise<Response> {
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

  const result = updatePointSchema.safeParse(await getJsonBody(ctx.req));

  if (!result.success) {
    return Response.json({ error: "Point update is invalid." }, { status: 400 });
  }

  const pointRow = await updatePoint(map.id, pointIdResult.data, result.data);

  if (!pointRow) {
    return Response.json({ error: "Point not found." }, { status: 404 });
  }

  const addedByUser = await getPointAddedByUser(map.id, pointRow);
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
