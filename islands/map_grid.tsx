import type { JSX } from "preact";
import { useEffect, useRef, useState } from "react";

type MapGridProps = {
  mapName: string;
};

type ViewState = {
  panX: number;
  panY: number;
  zoom: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

type Coordinate = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  x: number;
  y: number;
};

type Tick = {
  value: number;
  screen: number;
};

const cellMeters = 100;
const baseCellPixels = 80;
const minZoom = 0.32;
const maxZoom = 2.8;
const rangeRings = [500, 1000, 2000];

export default function MapGrid({ mapName }: MapGridProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [view, setView] = useState<ViewState>({ panX: 0, panY: 0, zoom: 1 });
  const [size, setSize] = useState<ViewportSize>(() => ({
    width: typeof globalThis.innerWidth === "number" ? globalThis.innerWidth : 0,
    height: typeof globalThis.innerHeight === "number" ? globalThis.innerHeight : 0,
  }));
  const [isDragging, setIsDragging] = useState(false);
  const [pointerCoord, setPointerCoord] = useState<Coordinate | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  const pixelsPerMeter = getPixelsPerMeter(view.zoom);
  const cellSize = baseCellPixels * view.zoom;
  const origin = worldToScreen({ x: 0, y: 0 }, view, size);
  const coordinate = pointerCoord ?? screenToWorld(size.width / 2, size.height / 2, view, size);
  const tickStep = getTickStep(cellSize);
  const ticks = getTicks(view, size, tickStep);
  const canvasStyle = [
    `--grid-cell: ${cellSize}px`,
    `--grid-major: ${cellSize * 5}px`,
    `--grid-origin-x: ${origin.x}px`,
    `--grid-origin-y: ${origin.y}px`,
  ].join(";");

  function handlePointerDown(event: JSX.TargetedPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setIsDragging(true);
    setPointerCoord(getEventCoordinate(event, view));
  }

  function handlePointerMove(event: JSX.TargetedPointerEvent<HTMLDivElement>) {
    setPointerCoord(getEventCoordinate(event, view));

    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.x;
    const deltaY = event.clientY - dragRef.current.y;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setView((currentView) => ({
      ...currentView,
      panX: currentView.panX + deltaX,
      panY: currentView.panY + deltaY,
    }));
  }

  function handlePointerEnd(event: JSX.TargetedPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  }

  function handlePointerLeave() {
    if (!isDragging) {
      setPointerCoord(null);
    }
  }

  function handleWheel(event: JSX.TargetedWheelEvent<HTMLDivElement>) {
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const anchorX = event.clientX - rect.left;
    const anchorY = event.clientY - rect.top;
    const zoomFactor = Math.exp(-event.deltaY * 0.0012);

    setView((currentView) =>
      zoomView(currentView, currentView.zoom * zoomFactor, anchorX, anchorY, {
        width: rect.width,
        height: rect.height,
      })
    );
  }

  function changeZoom(multiplier: number) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    setView((currentView) =>
      zoomView(currentView, currentView.zoom * multiplier, rect.width / 2, rect.height / 2, {
        width: rect.width,
        height: rect.height,
      })
    );
  }

  function resetView() {
    setView({ panX: 0, panY: 0, zoom: 1 });
  }

  function getEventCoordinate(
    event: JSX.TargetedPointerEvent<HTMLDivElement>,
    currentView: ViewState,
  ): Coordinate {
    const rect = event.currentTarget.getBoundingClientRect();
    return screenToWorld(event.clientX - rect.left, event.clientY - rect.top, currentView, {
      width: rect.width,
      height: rect.height,
    });
  }

  return (
    <div className="map-grid" aria-label={`${mapName} coordinate map`}>
      <div
        ref={canvasRef}
        className={`map-canvas${isDragging ? " is-dragging" : ""}`}
        aria-label="Infinite coordinate grid. Drag to pan or use the mouse wheel to zoom."
        style={canvasStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      >
        <div className="axis-line x-axis" style={{ top: `${origin.y}px` }} aria-hidden="true" />
        <div className="axis-line y-axis" style={{ left: `${origin.x}px` }} aria-hidden="true" />

        {rangeRings.map((radius) => {
          const diameter = radius * pixelsPerMeter * 2;

          return (
            <div
              key={radius}
              className="map-range-ring"
              style={{
                left: `${origin.x}px`,
                top: `${origin.y}px`,
                width: `${diameter}px`,
                height: `${diameter}px`,
              }}
              aria-hidden="true"
            />
          );
        })}

        {ticks.x.map((tick) => (
          <span
            key={`x-${tick.value}`}
            className="tick-label x-tick"
            style={{ left: `${tick.screen}px` }}
            aria-hidden="true"
          >
            {formatAxisValue(tick.value, "E", "W")}
          </span>
        ))}

        {ticks.y.map((tick) => (
          <span
            key={`y-${tick.value}`}
            className="tick-label y-tick"
            style={{ top: `${tick.screen}px` }}
            aria-hidden="true"
          >
            {formatAxisValue(tick.value, "N", "S")}
          </span>
        ))}

        <div
          className="map-origin-marker"
          style={{ left: `${origin.x}px`, top: `${origin.y}px` }}
          aria-label="Origin at X 0, Y 0"
        />
      </div>

      <div className="compass-label compass-north" aria-hidden="true">N</div>
      <div className="compass-label compass-east" aria-hidden="true">E</div>
      <div className="compass-label compass-south" aria-hidden="true">S</div>
      <div className="compass-label compass-west" aria-hidden="true">W</div>

      <div className="map-hud" aria-label="Map information">
        <h1>{mapName}</h1>
      </div>

      <div className="coordinate-panel" aria-live="polite">
        <span>{pointerCoord ? "Cursor" : "Center"}</span>
        <strong>X {formatCoordinate(coordinate.x)}</strong>
        <strong>Y {formatCoordinate(coordinate.y)}</strong>
      </div>

      <div className="map-control-panel" aria-label="Map controls">
        <button type="button" className="map-button" onClick={() => changeZoom(1.18)}>
          +
        </button>
        <button type="button" className="map-button" onClick={() => changeZoom(1 / 1.18)}>
          -
        </button>
        <button type="button" className="map-button wide" onClick={resetView}>
          Reset
        </button>
        <a className="map-link" href="/">Home</a>
      </div>

      <div className="map-scale" aria-hidden="true">
        <span style={{ width: `${cellSize}px` }} />
        <strong>100m</strong>
        <small>{Math.round(view.zoom * 100)}% zoom</small>
      </div>
    </div>
  );
}

function getPixelsPerMeter(zoom: number): number {
  return (baseCellPixels * zoom) / cellMeters;
}

function zoomView(
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

function screenToWorld(
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

function worldToScreen(
  coordinate: Coordinate,
  view: ViewState,
  size: ViewportSize,
): { x: number; y: number } {
  const pixelsPerMeter = getPixelsPerMeter(view.zoom);

  return {
    x: size.width / 2 + view.panX + coordinate.x * pixelsPerMeter,
    y: size.height / 2 + view.panY - coordinate.y * pixelsPerMeter,
  };
}

function getTicks(view: ViewState, size: ViewportSize, step: number): { x: Tick[]; y: Tick[] } {
  if (size.width <= 0 || size.height <= 0) {
    return { x: [], y: [] };
  }

  const topLeft = screenToWorld(0, 0, view, size);
  const bottomRight = screenToWorld(size.width, size.height, view, size);
  const minX = Math.floor(Math.min(topLeft.x, bottomRight.x) / step) * step;
  const maxX = Math.ceil(Math.max(topLeft.x, bottomRight.x) / step) * step;
  const minY = Math.floor(Math.min(topLeft.y, bottomRight.y) / step) * step;
  const maxY = Math.ceil(Math.max(topLeft.y, bottomRight.y) / step) * step;
  const x: Tick[] = [];
  const y: Tick[] = [];

  for (let value = minX; value <= maxX; value += step) {
    const screen = worldToScreen({ x: value, y: 0 }, view, size).x;

    if (screen >= -80 && screen <= size.width + 80) {
      x.push({ value, screen });
    }
  }

  for (let value = minY; value <= maxY; value += step) {
    const screen = worldToScreen({ x: 0, y: value }, view, size).y;

    if (screen >= -80 && screen <= size.height + 80) {
      y.push({ value, screen });
    }
  }

  return { x, y };
}

function getTickStep(cellSize: number): number {
  if (cellSize >= 58) {
    return 100;
  }

  if (cellSize >= 30) {
    return 200;
  }

  return 500;
}

function formatAxisValue(value: number, positiveLabel: string, negativeLabel: string): string {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? positiveLabel : negativeLabel} ${Math.abs(value)}`;
}

function formatCoordinate(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
