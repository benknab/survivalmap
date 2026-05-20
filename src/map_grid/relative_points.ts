import { noSavedPointMessage } from "./constants.ts";
import { formatCoordinateTuple, getPointOptionValue } from "./point_format.ts";
import type { MapPoint, PointDraft, RelativePointResult } from "./types.ts";

export function getRelativePointResult(
  draft: PointDraft,
  points: MapPoint[],
): RelativePointResult {
  if (points.length === 0) {
    return { point: null, coordinate: null, error: noSavedPointMessage };
  }

  const point = getPointFromTypeahead(draft, points);

  if (!point) {
    return { point: null, coordinate: null, error: "Choose a saved point from the suggestions." };
  }

  const bearing = parseDraftNumber(draft.relativeBearing);

  if (bearing === null) {
    return { point, coordinate: null, error: "Enter a numeric compass bearing." };
  }

  const distance = parseDraftNumber(draft.relativeDistance);

  if (distance === null || distance < 0) {
    return { point, coordinate: null, error: "Enter a distance of 0 meters or more." };
  }

  const bearingRadians = degreesToRadians(normalizeBearing(bearing));
  const vector = {
    x: Math.sin(bearingRadians) * distance,
    y: Math.cos(bearingRadians) * distance,
  };
  const coordinate = draft.relativeBearingOrigin === "saved-point"
    ? { x: point.x + vector.x, y: point.y + vector.y }
    : { x: point.x - vector.x, y: point.y - vector.y };

  return {
    point,
    coordinate,
    error: null,
  };
}

export function getRelativePointMessage(
  draft: PointDraft,
  result: RelativePointResult,
  isLoading: boolean,
): string | null {
  if (isLoading) {
    return "Loading saved points...";
  }

  if (!hasRelativePointInput(draft) && result.error !== noSavedPointMessage) {
    return null;
  }

  if (result.error) {
    return result.error;
  }

  if (!result.coordinate) {
    return null;
  }

  const z = Number(draft.z);
  return `Calculated position: ${
    formatCoordinateTuple(result.coordinate, Number.isFinite(z) ? z : 0)
  }.`;
}

export function getPointTypeaheadOptions(draft: PointDraft, points: MapPoint[]): MapPoint[] {
  const selectedPoint = draft.relativePointId === null
    ? null
    : points.find((point) => point.id === draft.relativePointId) ?? null;
  const normalizedQuery = normalizeTypeaheadValue(draft.relativePointQuery);

  if (
    !normalizedQuery ||
    (selectedPoint &&
      normalizeTypeaheadValue(getPointOptionValue(selectedPoint)) === normalizedQuery)
  ) {
    return points;
  }

  return points.filter((point) => {
    const normalizedName = normalizeTypeaheadValue(point.name);
    const normalizedOption = normalizeTypeaheadValue(getPointOptionValue(point));
    return normalizedName.includes(normalizedQuery) || normalizedOption.includes(normalizedQuery);
  });
}

function hasRelativePointInput(draft: PointDraft): boolean {
  return Boolean(
    draft.relativePointQuery.trim() || draft.relativeBearing.trim() ||
      draft.relativeDistance.trim(),
  );
}

function getPointFromTypeahead(draft: PointDraft, points: MapPoint[]): MapPoint | null {
  if (draft.relativePointId !== null) {
    const point = points.find((candidate) => candidate.id === draft.relativePointId);

    if (point) {
      return point;
    }
  }

  const normalizedQuery = normalizeTypeaheadValue(draft.relativePointQuery);

  if (!normalizedQuery) {
    return null;
  }

  const optionMatch = points.find((point) =>
    normalizeTypeaheadValue(getPointOptionValue(point)) === normalizedQuery
  );

  if (optionMatch) {
    return optionMatch;
  }

  const nameMatches = points.filter((point) =>
    normalizeTypeaheadValue(point.name) === normalizedQuery
  );

  return nameMatches.length === 1 ? nameMatches[0] : null;
}

function normalizeTypeaheadValue(value: string): string {
  return value.trim().toLowerCase();
}

function parseDraftNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeBearing(value: number): number {
  return ((value % 360) + 360) % 360;
}

function degreesToRadians(value: number): number {
  return value * (Math.PI / 180);
}
