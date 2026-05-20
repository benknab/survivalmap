import type {
  MapPoint,
  PointCreateResponse,
  PointInput,
  PointListResponse,
  PointPatchInput,
  PointUpdateResponse,
} from "./types.ts";

export async function fetchPoints(mapId: string, signal?: AbortSignal): Promise<MapPoint[]> {
  const response = await fetch(getPointsPath(mapId), { signal });
  const payload = await readJsonResponse<PointListResponse>(response, "Could not load points.");

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load points.");
  }

  return Array.isArray(payload.points) ? payload.points : [];
}

export async function createPointRequest(mapId: string, point: PointInput): Promise<MapPoint> {
  const response = await fetch(getPointsPath(mapId), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(point),
  });
  const payload = await readJsonResponse<PointCreateResponse>(response, "Could not save point.");
  const savedPoint = payload.point;

  if (!response.ok || !savedPoint) {
    throw new Error(payload.error ?? "Could not save point.");
  }

  return savedPoint;
}

export async function updatePointRequest(
  mapId: string,
  pointId: number,
  point: PointPatchInput,
  fallback: string,
): Promise<MapPoint> {
  const response = await fetch(getPointPath(mapId, pointId), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(point),
  });
  const payload = await readJsonResponse<PointUpdateResponse>(response, fallback);
  const updatedPoint = payload.point;

  if (!response.ok || !updatedPoint) {
    throw new Error(payload.error ?? fallback);
  }

  return updatedPoint;
}

function getPointsPath(mapId: string): string {
  return `/map/${encodeURIComponent(mapId)}/points`;
}

function getPointPath(mapId: string, pointId: number): string {
  return `${getPointsPath(mapId)}/${encodeURIComponent(pointId)}`;
}

async function readJsonResponse<T>(response: Response, fallback: string): Promise<T> {
  const text = await response.text();

  if (!text) {
    throw new Error(fallback);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(fallback);
  }
}
