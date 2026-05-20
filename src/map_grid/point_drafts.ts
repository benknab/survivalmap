import { defaultPointColor, defaultPointEmoji } from "../point_style.ts";
import { formatCoordinateInput } from "./point_format.ts";
import type { Coordinate, MapPoint, PointDraft, PointEditDraft } from "./types.ts";

export function createPointDraft(targetCoordinate: Coordinate): PointDraft {
  return {
    formMode: "bearing",
    name: "",
    emoji: defaultPointEmoji,
    color: defaultPointColor,
    x: formatCoordinateInput(targetCoordinate.x),
    y: formatCoordinateInput(targetCoordinate.y),
    z: "0",
    relativeBearingOrigin: "new-point",
    relativePointId: null,
    relativePointQuery: "",
    relativeBearing: "",
    relativeDistance: "",
  };
}

export function getPointEditDraft(point: MapPoint): PointEditDraft {
  return {
    name: point.name,
    emoji: point.emoji,
    color: point.color,
  };
}

export function getPointZIndex(
  pointId: number,
  selectedPointId: number | null,
  hoveredPointId: number | null,
): number {
  if (hoveredPointId === pointId) {
    return 30;
  }

  return selectedPointId === pointId ? 20 : 2;
}
