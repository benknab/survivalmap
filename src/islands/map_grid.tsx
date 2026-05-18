import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ComponentChildren, FunctionComponent, JSX } from "preact";
import { useEffect, useRef, useState } from "react";

type MapGridProps = {
  mapId: string;
  mapName: string;
  currentUserNickname: string;
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

type MapPoint = {
  id: number;
  mapId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  addedByUserId: number;
  deletedAt: string | null;
  addedByNickname: string;
};

type PointDraft = {
  name: string;
  x: string;
  y: string;
  z: string;
};

type PointInput = {
  name: string;
  x: number;
  y: number;
  z: number;
};

type PointListResponse = {
  points?: MapPoint[];
  error?: string;
};

type PointCreateResponse = {
  point?: MapPoint;
  error?: string;
};

type PointUpdateResponse = {
  point?: MapPoint;
  error?: string;
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

// TanStack ships React typings; Fresh runs it through Preact compat at runtime.
const PreactQueryClientProvider = QueryClientProvider as unknown as FunctionComponent<{
  client: QueryClient;
  children: ComponentChildren;
}>;

export default function MapGrid(props: MapGridProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PreactQueryClientProvider client={queryClient}>
      <MapGridContents {...props} />
    </PreactQueryClientProvider>
  );
}

function MapGridContents({ mapId, mapName }: MapGridProps) {
  const queryClient = useQueryClient();
  const pointsQueryKey = ["map-points", mapId] as const;
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [view, setView] = useState<ViewState>({ panX: 0, panY: 0, zoom: 1 });
  const [size, setSize] = useState<ViewportSize>(() => ({
    width: typeof globalThis.innerWidth === "number" ? globalThis.innerWidth : 0,
    height: typeof globalThis.innerHeight === "number" ? globalThis.innerHeight : 0,
  }));
  const [isDragging, setIsDragging] = useState(false);
  const [pointerCoord, setPointerCoord] = useState<Coordinate | null>(null);
  const [pointDraft, setPointDraft] = useState<PointDraft | null>(null);
  const [pointError, setPointError] = useState<string | null>(null);
  const [pendingPointIds, setPendingPointIds] = useState<number[]>([]);
  const pointsQuery = useQuery({
    queryKey: pointsQueryKey,
    queryFn: ({ signal }) => fetchPoints(mapId, signal),
  });
  const createPointMutation = useMutation({
    mutationFn: (point: PointInput) => createPoint(mapId, point),
    onSuccess: (savedPoint) => {
      queryClient.setQueryData<MapPoint[]>(pointsQueryKey, (currentPoints) => [
        ...(currentPoints ?? []),
        savedPoint,
      ]);
      setPointDraft(null);
    },
    onError: (error) => {
      setPointError(getErrorMessage(error, "Could not save point."));
    },
  });
  const updatePointMutation = useMutation({
    mutationFn: ({ pointId, deleted }: { pointId: number; deleted: boolean }) =>
      updatePointDeletedState(mapId, pointId, deleted),
    onSuccess: (updatedPoint) => {
      queryClient.setQueryData<MapPoint[]>(
        pointsQueryKey,
        (currentPoints) =>
          currentPoints?.map((point) => point.id === updatedPoint.id ? updatedPoint : point) ?? [
            updatedPoint,
          ],
      );
    },
    onError: (error, { deleted }) => {
      setPointError(getErrorMessage(error, `Could not ${deleted ? "remove" : "restore"} point.`));
    },
    onSettled: (_updatedPoint, _error, { pointId }) => {
      setPendingPointIds((currentIds) => currentIds.filter((id) => id !== pointId));
    },
  });

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
  const points = pointsQuery.data ?? [];
  const activePoints = points.filter((point) => !point.deletedAt);
  const deletedPoints = points.filter((point) => point.deletedAt);
  const visiblePointError = pointError ??
    (pointsQuery.error ? getErrorMessage(pointsQuery.error, "Could not load points.") : null);
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

  function startPointDraft() {
    const targetCoordinate = pointerCoord ??
      screenToWorld(size.width / 2, size.height / 2, view, size);
    setPointDraft({
      name: "",
      x: formatCoordinateInput(targetCoordinate.x),
      y: formatCoordinateInput(targetCoordinate.y),
      z: "0",
    });
    setPointError(null);
  }

  function updatePointDraft(field: keyof PointDraft, value: string) {
    setPointDraft((currentDraft) => currentDraft ? { ...currentDraft, [field]: value } : null);
  }

  function handlePointSubmit(event: JSX.TargetedSubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pointDraft || createPointMutation.isPending) {
      return;
    }

    const nextPoint = {
      name: pointDraft.name.trim(),
      x: Number(pointDraft.x),
      y: Number(pointDraft.y),
      z: Number(pointDraft.z),
    };

    if (
      !nextPoint.name || !Number.isFinite(nextPoint.x) || !Number.isFinite(nextPoint.y) ||
      !Number.isFinite(nextPoint.z)
    ) {
      setPointError("Enter a point name and numeric X, Y, and Z coordinates.");
      return;
    }

    setPointError(null);
    createPointMutation.mutate(nextPoint);
  }

  function handleUpdatePointDeletedState(pointId: number, deleted: boolean) {
    if (pendingPointIds.includes(pointId)) {
      return;
    }

    setPendingPointIds((currentIds) => [...currentIds, pointId]);
    setPointError(null);
    updatePointMutation.mutate({ pointId, deleted });
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
          aria-label="Origin at (0, 0, 0)"
        />

        {activePoints.map((point) => {
          const screen = worldToScreen(point, view, size);

          return (
            <div
              key={point.id}
              className="point-marker"
              style={{ left: `${screen.x}px`, top: `${screen.y}px` }}
              role="img"
              aria-label={`${point.name} at ${formatCoordinateTuple(point, point.z)}`}
            >
              <span className="point-marker-dot" aria-hidden="true" />
              <span className="point-marker-label">
                <strong>{point.name}</strong>
                <small>{formatCoordinateTuple(point, point.z)}</small>
              </span>
            </div>
          );
        })}
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
        <strong>{formatCoordinateTuple(coordinate, 0)}</strong>
      </div>

      <div className="point-panel" aria-label="Points of interest">
        <div className="point-panel-header">
          <div>
            <span>POI</span>
            <strong>
              {activePoints.length === 1 ? "1 point" : `${activePoints.length} points`}
            </strong>
          </div>
          <button type="button" className="map-button point-add-button" onClick={startPointDraft}>
            Add point
          </button>
        </div>

        {pointDraft
          ? (
            <form className="point-form" onSubmit={handlePointSubmit}>
              <label>
                Name
                <input
                  name="name"
                  maxLength={80}
                  required
                  autoFocus
                  placeholder="Cabin cache"
                  value={pointDraft.name}
                  onInput={(event) => updatePointDraft("name", event.currentTarget.value)}
                />
              </label>
              <div className="point-coordinate-grid">
                <label>
                  X
                  <input
                    name="x"
                    type="number"
                    step="any"
                    required
                    value={pointDraft.x}
                    onInput={(event) => updatePointDraft("x", event.currentTarget.value)}
                  />
                </label>
                <label>
                  Y
                  <input
                    name="y"
                    type="number"
                    step="any"
                    required
                    value={pointDraft.y}
                    onInput={(event) => updatePointDraft("y", event.currentTarget.value)}
                  />
                </label>
                <label>
                  Z
                  <input
                    name="z"
                    type="number"
                    step="any"
                    required
                    value={pointDraft.z}
                    onInput={(event) => updatePointDraft("z", event.currentTarget.value)}
                  />
                </label>
              </div>
              <div className="point-form-actions">
                <button type="submit" disabled={createPointMutation.isPending}>
                  {createPointMutation.isPending ? "Saving..." : "Save point"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={createPointMutation.isPending}
                  onClick={() => setPointDraft(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )
          : null}

        {visiblePointError
          ? <p className="point-message error" role="alert">{visiblePointError}</p>
          : null}

        {pointsQuery.isPending
          ? <p className="point-message">Loading points...</p>
          : activePoints.length === 0
          ? (
            <p className="point-message">
              {points.length === 0 ? "No points saved yet." : "No active points."}
            </p>
          )
          : (
            <ol className="point-list">
              {activePoints.map((point) => {
                const isPending = pendingPointIds.includes(point.id);

                return (
                  <li key={point.id}>
                    <div className="point-list-details">
                      <div className="point-list-title">
                        <strong>{point.name}</strong>
                        <small>({point.addedByNickname})</small>
                      </div>
                      <span>{formatCoordinateTuple(point, point.z)}</span>
                    </div>
                    <button
                      type="button"
                      className="point-action-button remove"
                      aria-label={isPending ? `Removing ${point.name}` : `Remove ${point.name}`}
                      title={isPending ? "Removing point" : "Remove point"}
                      disabled={isPending}
                      onClick={() => handleUpdatePointDeletedState(point.id, true)}
                    >
                      <TrashIcon />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

        {deletedPoints.length > 0
          ? (
            <>
              <div className="point-section-title">
                Removed {deletedPoints.length === 1 ? "point" : "points"}
              </div>
              <ol className="point-list point-list-removed">
                {deletedPoints.map((point) => {
                  const isPending = pendingPointIds.includes(point.id);

                  return (
                    <li key={point.id}>
                      <div className="point-list-details">
                        <div className="point-list-title">
                          <strong>{point.name}</strong>
                          <small>({point.addedByNickname})</small>
                        </div>
                        <span>{formatCoordinateTuple(point, point.z)}</span>
                      </div>
                      <button
                        type="button"
                        className="point-action-button"
                        aria-label={isPending ? `Restoring ${point.name}` : `Restore ${point.name}`}
                        title={isPending ? "Restoring point" : "Restore point"}
                        disabled={isPending}
                        onClick={() => handleUpdatePointDeletedState(point.id, false)}
                      >
                        <RestoreIcon />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </>
          )
          : null}
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

function formatCoordinateTuple(coordinate: Coordinate, z: number): string {
  return `(${formatCoordinate(coordinate.x)}, ${formatCoordinate(coordinate.y)}, ${
    formatCoordinate(z)
  })`;
}

function formatCoordinate(value: number): string {
  const rounded = Math.round(value);
  return `${rounded}`;
}

function formatCoordinateInput(value: number): string {
  return String(Math.round(value));
}

function getPointsPath(mapId: string): string {
  return `/map/${encodeURIComponent(mapId)}/points`;
}

function getPointPath(mapId: string, pointId: number): string {
  return `${getPointsPath(mapId)}/${encodeURIComponent(pointId)}`;
}

async function fetchPoints(mapId: string, signal?: AbortSignal): Promise<MapPoint[]> {
  const response = await fetch(getPointsPath(mapId), { signal });
  const payload = await readJsonResponse<PointListResponse>(response, "Could not load points.");

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load points.");
  }

  return Array.isArray(payload.points) ? payload.points : [];
}

async function createPoint(mapId: string, point: PointInput): Promise<MapPoint> {
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

async function updatePointDeletedState(
  mapId: string,
  pointId: number,
  deleted: boolean,
): Promise<MapPoint> {
  const response = await fetch(getPointPath(mapId, pointId), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deleted }),
  });
  const payload = await readJsonResponse<PointUpdateResponse>(
    response,
    `Could not ${deleted ? "remove" : "restore"} point.`,
  );
  const updatedPoint = payload.point;

  if (!response.ok || !updatedPoint) {
    throw new Error(payload.error ?? `Could not ${deleted ? "remove" : "restore"} point.`);
  }

  return updatedPoint;
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

function TrashIcon() {
  return (
    <svg className="point-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg className="point-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 7a7 7 0 1 1-1.8 6.8" />
      <path d="M7 7H3V3" />
    </svg>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
