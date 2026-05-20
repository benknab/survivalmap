import type { JSX } from "preact";
import { getPointZIndex } from "./point_drafts.ts";
import { formatCoordinateTuple, formatPointName } from "./point_format.ts";
import type { Coordinate, CursorPosition, MapPoint, ViewportSize, ViewState } from "./types.ts";
import { worldToScreen } from "./view_math.ts";

type MapCanvasProps = {
  canvasRef: { current: HTMLDivElement | null };
  activePoints: MapPoint[];
  selectedPointId: number | null;
  hoveredPointId: number | null;
  view: ViewState;
  size: ViewportSize;
  origin: Coordinate;
  canvasStyle: string;
  isDragging: boolean;
  cursorPosition: CursorPosition | null;
  onPointerDown: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
  onPointerLeave: () => void;
  onWheel: (event: JSX.TargetedWheelEvent<HTMLDivElement>) => void;
  onSelectPoint: (point: MapPoint) => void;
  onPointHoverStart: (pointId: number) => void;
  onPointHoverEnd: (pointId: number) => void;
};

export function MapCanvas(props: MapCanvasProps): JSX.Element {
  return (
    <>
      <div
        ref={props.canvasRef}
        className={`map-canvas${props.isDragging ? " is-dragging" : ""}`}
        aria-label="Infinite coordinate grid. Drag to pan or use the mouse wheel to zoom."
        style={props.canvasStyle}
        onPointerDown={props.onPointerDown}
        onPointerMove={props.onPointerMove}
        onPointerUp={props.onPointerEnd}
        onPointerCancel={props.onPointerEnd}
        onLostPointerCapture={props.onPointerEnd}
        onPointerLeave={props.onPointerLeave}
        onWheel={props.onWheel}
      >
        <div
          className="axis-line x-axis"
          style={{ top: `${props.origin.y}px` }}
          aria-hidden="true"
        />
        <div
          className="axis-line y-axis"
          style={{ left: `${props.origin.x}px` }}
          aria-hidden="true"
        />
        {props.activePoints.map((point) => (
          <PointMarker
            key={point.id}
            point={point}
            screen={worldToScreen(point, props.view, props.size)}
            isSelected={props.selectedPointId === point.id}
            zIndex={getPointZIndex(point.id, props.selectedPointId, props.hoveredPointId)}
            onSelect={props.onSelectPoint}
            onHoverStart={props.onPointHoverStart}
            onHoverEnd={props.onPointHoverEnd}
          />
        ))}
      </div>
      {props.cursorPosition ? <CursorCoordinate cursorPosition={props.cursorPosition} /> : null}
    </>
  );
}

function PointMarker(
  { point, screen, isSelected, zIndex, onSelect, onHoverStart, onHoverEnd }: {
    point: MapPoint;
    screen: Coordinate;
    isSelected: boolean;
    zIndex: number;
    onSelect: (point: MapPoint) => void;
    onHoverStart: (pointId: number) => void;
    onHoverEnd: (pointId: number) => void;
  },
): JSX.Element {
  return (
    <button
      type="button"
      className={`point-marker${isSelected ? " is-selected" : ""}`}
      style={{ left: `${screen.x}px`, top: `${screen.y}px`, zIndex }}
      aria-label={`${formatPointName(point)} at ${formatCoordinateTuple(point, point.z)}`}
      aria-pressed={isSelected}
      onClick={() => onSelect(point)}
      onFocus={() => onHoverStart(point.id)}
      onBlur={() => onHoverEnd(point.id)}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerEnter={() => onHoverStart(point.id)}
      onPointerLeave={() => onHoverEnd(point.id)}
    >
      <span
        className="point-marker-dot"
        style={{ backgroundColor: point.color }}
        aria-hidden="true"
      />
      <span className="point-marker-label">
        <strong>{formatPointName(point)}</strong>
        <small>{formatCoordinateTuple(point, point.z)}</small>
      </span>
    </button>
  );
}

function CursorCoordinate({ cursorPosition }: { cursorPosition: CursorPosition }): JSX.Element {
  return (
    <div
      className="cursor-coordinate"
      style={{ left: `${cursorPosition.screen.x}px`, top: `${cursorPosition.screen.y}px` }}
      aria-hidden="true"
    >
      {formatCoordinateTuple(cursorPosition.coordinate, 0)}
    </div>
  );
}
