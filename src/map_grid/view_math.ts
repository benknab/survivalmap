import { baseCellPixels, cellMeters, maxZoom, minZoom } from "./constants.ts";
import type { Coordinate, ViewportSize, ViewState } from "./types.ts";

export function getPixelsPerMeter(zoom: number): number {
  return (baseCellPixels * zoom) / cellMeters;
}

export function zoomView(
  view: ViewState,
  nextZoom: number,
  anchorX: number,
  anchorY: number,
  size: ViewportSize,
): ViewState {
  const zoom = clamp(nextZoom, minZoom, maxZoom);
  const currentPixelsPerMeter = getPixelsPerMeter(view.zoom);
  const nextPixelsPerMeter = getPixelsPerMeter(zoom);
  const worldX = (anchorX - size.width / 2 - view.panX) / currentPixelsPerMeter;
  const worldY = -(anchorY - size.height / 2 - view.panY) / currentPixelsPerMeter;

  return {
    zoom,
    panX: anchorX - size.width / 2 - worldX * nextPixelsPerMeter,
    panY: anchorY - size.height / 2 + worldY * nextPixelsPerMeter,
  };
}

export function centerViewOnCoordinate(view: ViewState, coordinate: Coordinate): ViewState {
  const pixelsPerMeter = getPixelsPerMeter(view.zoom);

  return {
    ...view,
    panX: -coordinate.x * pixelsPerMeter,
    panY: coordinate.y * pixelsPerMeter,
  };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  view: ViewState,
  size: ViewportSize,
): Coordinate {
  const pixelsPerMeter = getPixelsPerMeter(view.zoom);

  return {
    x: (screenX - size.width / 2 - view.panX) / pixelsPerMeter,
    y: -(screenY - size.height / 2 - view.panY) / pixelsPerMeter,
  };
}

export function worldToScreen(
  coordinate: Coordinate,
  view: ViewState,
  size: ViewportSize,
): Coordinate {
  const pixelsPerMeter = getPixelsPerMeter(view.zoom);

  return {
    x: size.width / 2 + view.panX + coordinate.x * pixelsPerMeter,
    y: size.height / 2 + view.panY - coordinate.y * pixelsPerMeter,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
