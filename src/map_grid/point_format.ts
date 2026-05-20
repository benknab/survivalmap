import type { Coordinate, MapPoint } from "./types.ts";

export function formatCoordinateTuple(coordinate: Coordinate, z: number): string {
  return `(${formatCoordinate(coordinate.x)}, ${formatCoordinate(coordinate.y)}, ${
    formatCoordinate(z)
  })`;
}

export function formatCoordinateInput(value: number): string {
  return String(Math.round(value));
}

export function formatPointName(point: Pick<MapPoint, "emoji" | "name">): string {
  return `${point.emoji} ${point.name}`;
}

export function getPointOptionValue(point: MapPoint): string {
  return `${point.name} ${formatCoordinateTuple(point, point.z)}`;
}

function formatCoordinate(value: number): string {
  const rounded = Math.round(value);
  return `${rounded}`;
}
