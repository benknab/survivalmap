import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ComponentChildren, FunctionComponent, JSX } from "preact";
import { useEffect, useRef, useState } from "react";
import {
  defaultPointColor,
  defaultPointEmoji,
  pointColorOptions,
  pointEmojiOptions,
} from "../point_style.ts";

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

type CursorPosition = {
  coordinate: Coordinate;
  screen: Coordinate;
};

type MapPoint = {
  id: number;
  mapId: string;
  name: string;
  emoji: string;
  color: string;
  x: number;
  y: number;
  z: number;
  addedByUserId: number;
  deletedAt: string | null;
  addedByNickname: string;
};

type PointFormMode = "bearing" | "manual";

type PointDraft = {
  formMode: PointFormMode;
  name: string;
  emoji: string;
  color: string;
  x: string;
  y: string;
  z: string;
  relativePointId: number | null;
  relativePointQuery: string;
  relativeBearing: string;
  relativeDistance: string;
};

type PointDraftTextField = Exclude<keyof PointDraft, "formMode" | "relativePointId">;

type PointInput = {
  name: string;
  emoji: string;
  color: string;
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

type RelativePointResult = {
  point: MapPoint | null;
  coordinate: Coordinate | null;
  error: string | null;
};

const cellMeters = 100;
const baseCellPixels = 48;
const minZoom = 0.32;
const maxZoom = 2.8;
const noSavedPointMessage = "Save a point before using bearing input.";

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
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [pointDraft, setPointDraft] = useState<PointDraft | null>(null);
  const [pointError, setPointError] = useState<string | null>(null);
  const [pendingPointIds, setPendingPointIds] = useState<number[]>([]);
  const [isRelativePointListOpen, setIsRelativePointListOpen] = useState(false);
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
      setIsRelativePointListOpen(false);
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

  const cellSize = baseCellPixels * view.zoom;
  const origin = worldToScreen({ x: 0, y: 0 }, view, size);
  const points = pointsQuery.data ?? [];
  const activePoints = points.filter((point) => !point.deletedAt);
  const deletedPoints = points.filter((point) => point.deletedAt);
  const relativePointResult = pointDraft?.formMode === "bearing"
    ? getRelativePointResult(pointDraft, activePoints)
    : null;
  const relativePointMessage = pointDraft && relativePointResult
    ? getRelativePointMessage(pointDraft, relativePointResult, pointsQuery.isPending)
    : null;
  const relativePointMessageIsError = Boolean(relativePointResult?.error && !pointsQuery.isPending);
  const relativePointOptions = pointDraft?.formMode === "bearing"
    ? getPointTypeaheadOptions(pointDraft, activePoints)
    : [];
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
    setCursorPosition(getEventCursorPosition(event, view));
  }

  function handlePointerMove(event: JSX.TargetedPointerEvent<HTMLDivElement>) {
    setCursorPosition(getEventCursorPosition(event, view));

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
      setCursorPosition(null);
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

  function startPointDraft() {
    const targetCoordinate = cursorPosition?.coordinate ??
      screenToWorld(size.width / 2, size.height / 2, view, size);
    setPointDraft({
      formMode: "bearing",
      name: "",
      emoji: defaultPointEmoji,
      color: defaultPointColor,
      x: formatCoordinateInput(targetCoordinate.x),
      y: formatCoordinateInput(targetCoordinate.y),
      z: "0",
      relativePointId: null,
      relativePointQuery: "",
      relativeBearing: "",
      relativeDistance: "",
    });
    setIsRelativePointListOpen(false);
    setPointError(null);
  }

  function updatePointDraft(field: PointDraftTextField, value: string) {
    setPointDraft((currentDraft) => {
      if (!currentDraft) {
        return null;
      }

      return {
        ...currentDraft,
        [field]: value,
        relativePointId: field === "relativePointQuery" ? null : currentDraft.relativePointId,
      };
    });
  }

  function switchPointFormMode(formMode: PointFormMode) {
    setPointDraft((currentDraft) => currentDraft ? { ...currentDraft, formMode } : null);
    setIsRelativePointListOpen(false);
    setPointError(null);
  }

  function selectRelativePoint(point: MapPoint) {
    setPointDraft((currentDraft) => {
      if (!currentDraft) {
        return null;
      }

      return {
        ...currentDraft,
        relativePointId: point.id,
        relativePointQuery: getPointOptionValue(point),
      };
    });
    setIsRelativePointListOpen(false);
  }

  function cancelPointDraft() {
    setPointDraft(null);
    setIsRelativePointListOpen(false);
  }

  function handleManualPointSubmit(event: JSX.TargetedSubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pointDraft || createPointMutation.isPending) {
      return;
    }

    const nextPoint = {
      name: pointDraft.name.trim(),
      emoji: pointDraft.emoji,
      color: pointDraft.color,
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

  function handleBearingPointSubmit(event: JSX.TargetedSubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pointDraft || createPointMutation.isPending) {
      return;
    }

    const relativeResult = getRelativePointResult(pointDraft, activePoints);

    if (!relativeResult.coordinate) {
      setPointError(relativeResult.error ?? "Enter a saved point, bearing, and distance.");
      return;
    }

    const nextPoint = {
      name: pointDraft.name.trim(),
      emoji: pointDraft.emoji,
      color: pointDraft.color,
      x: relativeResult.coordinate.x,
      y: relativeResult.coordinate.y,
      z: Number(pointDraft.z),
    };

    if (!nextPoint.name || !Number.isFinite(nextPoint.z)) {
      setPointError("Enter a point name and numeric Z coordinate.");
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

  function getEventCursorPosition(
    event: JSX.TargetedPointerEvent<HTMLDivElement>,
    currentView: ViewState,
  ): CursorPosition {
    const rect = event.currentTarget.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    return {
      coordinate: screenToWorld(screen.x, screen.y, currentView, {
        width: rect.width,
        height: rect.height,
      }),
      screen,
    };
  }

  return (
    <div
      className={`map-grid${isDrawerOpen ? "" : " is-drawer-closed"}`}
      aria-label={`${mapName} coordinate map`}
    >
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

        {activePoints.map((point) => {
          const screen = worldToScreen(point, view, size);

          return (
            <div
              key={point.id}
              className="point-marker"
              style={{ left: `${screen.x}px`, top: `${screen.y}px` }}
              role="img"
              aria-label={`${formatPointName(point)} at ${formatCoordinateTuple(point, point.z)}`}
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
            </div>
          );
        })}
      </div>

      {cursorPosition
        ? (
          <div
            className="cursor-coordinate"
            style={{
              left: `${cursorPosition.screen.x}px`,
              top: `${cursorPosition.screen.y}px`,
            }}
            aria-hidden="true"
          >
            {formatCoordinateTuple(cursorPosition.coordinate, 0)}
          </div>
        )
        : null}

      <div className="point-panel" aria-label="Points of interest" hidden={!isDrawerOpen}>
        <div className="point-panel-header">
          <strong>
            {activePoints.length === 1 ? "1 point" : `${activePoints.length} points`}
          </strong>
          <button
            type="button"
            className="map-icon-button point-add-button"
            aria-label="Add point"
            title="Add point"
            onClick={startPointDraft}
          >
            <PlusIcon />
          </button>
        </div>

        {pointDraft
          ? (
            <>
              <div className="point-form-tabs" role="tablist" aria-label="Point input method">
                <button
                  type="button"
                  role="tab"
                  className={`point-form-tab${pointDraft.formMode === "bearing" ? " active" : ""}`}
                  aria-selected={pointDraft.formMode === "bearing"}
                  onClick={() => switchPointFormMode("bearing")}
                >
                  Bearing
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`point-form-tab${pointDraft.formMode === "manual" ? " active" : ""}`}
                  aria-selected={pointDraft.formMode === "manual"}
                  onClick={() => switchPointFormMode("manual")}
                >
                  Manual
                </button>
              </div>

              {pointDraft.formMode === "bearing"
                ? (
                  <form className="point-form" onSubmit={handleBearingPointSubmit}>
                    <p className="point-relative-help">
                      Stand at the new point, look at a saved point, then enter that compass bearing
                      and estimated distance.
                    </p>
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
                    <PointStylePicker draft={pointDraft} onChange={updatePointDraft} />
                    <div className="point-typeahead-field">
                      <label htmlFor="relative-point-query">Looking at saved point</label>
                      <div className="point-typeahead">
                        <input
                          id="relative-point-query"
                          name="relativePointQuery"
                          role="combobox"
                          aria-autocomplete="list"
                          aria-controls="relative-point-options"
                          aria-expanded={isRelativePointListOpen}
                          autoComplete="off"
                          placeholder="Search saved points"
                          value={pointDraft.relativePointQuery}
                          onFocus={() => setIsRelativePointListOpen(true)}
                          onClick={() => setIsRelativePointListOpen(true)}
                          onBlur={() => setIsRelativePointListOpen(false)}
                          onInput={(event) => {
                            updatePointDraft("relativePointQuery", event.currentTarget.value);
                            setIsRelativePointListOpen(true);
                          }}
                        />
                        {isRelativePointListOpen
                          ? (
                            <div
                              id="relative-point-options"
                              className="point-typeahead-list"
                              role="listbox"
                            >
                              {pointsQuery.isPending
                                ? <div className="point-typeahead-empty">Loading points...</div>
                                : relativePointOptions.length > 0
                                ? relativePointOptions.map((point) => (
                                  <button
                                    key={point.id}
                                    type="button"
                                    className="point-typeahead-option"
                                    role="option"
                                    aria-selected={pointDraft.relativePointId === point.id}
                                    onPointerDown={(event) => {
                                      event.preventDefault();
                                      selectRelativePoint(point);
                                    }}
                                  >
                                    <strong>{formatPointName(point)}</strong>
                                    <span>{formatCoordinateTuple(point, point.z)}</span>
                                  </button>
                                ))
                                : <div className="point-typeahead-empty">No matching points.</div>}
                            </div>
                          )
                          : null}
                      </div>
                    </div>
                    <div className="point-coordinate-grid">
                      <label>
                        Bearing deg
                        <input
                          name="relativeBearing"
                          type="number"
                          step="any"
                          placeholder="0-360"
                          value={pointDraft.relativeBearing}
                          onInput={(event) =>
                            updatePointDraft("relativeBearing", event.currentTarget.value)}
                        />
                      </label>
                      <label>
                        Distance m
                        <input
                          name="relativeDistance"
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Meters"
                          value={pointDraft.relativeDistance}
                          onInput={(event) =>
                            updatePointDraft("relativeDistance", event.currentTarget.value)}
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
                    {relativePointMessage
                      ? (
                        <p
                          className={`point-relative-help${
                            relativePointMessageIsError ? " error" : ""
                          }`}
                        >
                          {relativePointMessage}
                        </p>
                      )
                      : null}
                    <div className="point-form-actions">
                      <button type="submit" disabled={createPointMutation.isPending}>
                        {createPointMutation.isPending ? "Saving..." : "Save point"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={createPointMutation.isPending}
                        onClick={cancelPointDraft}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )
                : (
                  <form className="point-form" onSubmit={handleManualPointSubmit}>
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
                    <PointStylePicker draft={pointDraft} onChange={updatePointDraft} />
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
                        onClick={cancelPointDraft}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
            </>
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
                        <strong>{formatPointName(point)}</strong>
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
                          <strong>{formatPointName(point)}</strong>
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

      <button
        type="button"
        className="drawer-toggle-button"
        aria-label={isDrawerOpen ? "Close points drawer" : "Open points drawer"}
        aria-expanded={isDrawerOpen}
        title={isDrawerOpen ? "Close points drawer" : "Open points drawer"}
        onClick={() => setIsDrawerOpen((open) => !open)}
      >
        {isDrawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </button>

      <div className="map-control-stack">
        <div className="map-control-panel" aria-label="Map controls">
          <button
            type="button"
            className="map-icon-button"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={() => changeZoom(1.18)}
          >
            <PlusIcon />
          </button>
          <button
            type="button"
            className="map-icon-button"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => changeZoom(1 / 1.18)}
          >
            <MinusIcon />
          </button>
        </div>

        <div className="map-bottom-tools">
          <div className="map-scale" aria-hidden="true">
            <span style={{ width: `${cellSize}px` }} />
            <strong>100m</strong>
            <small>{Math.round(view.zoom * 100)}% zoom</small>
          </div>
          <div className="map-compass" aria-label="North is up" title="North is up">
            <CompassIcon />
          </div>
        </div>
      </div>
    </div>
  );
}

type PointStylePickerProps = {
  draft: PointDraft;
  onChange: (field: PointDraftTextField, value: string) => void;
};

function PointStylePicker({ draft, onChange }: PointStylePickerProps) {
  return (
    <div className="point-style-picker">
      <div>
        <span className="point-picker-label">Emoji</span>
        <div className="point-picker-options" role="group" aria-label="Point emoji">
          {pointEmojiOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="point-picker-button point-emoji-picker-button"
              aria-label={`${option.label} emoji`}
              aria-pressed={draft.emoji === option.value}
              title={option.label}
              onClick={() => onChange("emoji", option.value)}
            >
              {option.value}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="point-picker-label">Color</span>
        <div className="point-picker-options" role="group" aria-label="Point color">
          {pointColorOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="point-picker-button point-color-picker-button"
              aria-label={`${option.label} point color`}
              aria-pressed={draft.color === option.value}
              title={option.label}
              onClick={() => onChange("color", option.value)}
            >
              <span style={{ backgroundColor: option.value }} aria-hidden="true" />
            </button>
          ))}
        </div>
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

function formatPointName(point: Pick<MapPoint, "emoji" | "name">): string {
  return `${point.emoji} ${point.name}`;
}

function hasRelativePointInput(draft: PointDraft): boolean {
  return Boolean(
    draft.relativePointQuery.trim() || draft.relativeBearing.trim() ||
      draft.relativeDistance.trim(),
  );
}

function getRelativePointResult(draft: PointDraft, points: MapPoint[]): RelativePointResult {
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

  return {
    point,
    coordinate: {
      x: point.x - Math.sin(bearingRadians) * distance,
      y: point.y - Math.cos(bearingRadians) * distance,
    },
    error: null,
  };
}

function getRelativePointMessage(
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

function getPointTypeaheadOptions(draft: PointDraft, points: MapPoint[]): MapPoint[] {
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

function getPointFromTypeahead(draft: PointDraft, points: MapPoint[]): MapPoint | null {
  if (draft.relativePointId !== null) {
    const point = points.find((point) => point.id === draft.relativePointId);

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

function getPointOptionValue(point: MapPoint): string {
  return `${point.name} ${formatCoordinateTuple(point, point.z)}`;
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

function PlusIcon() {
  return (
    <svg className="map-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg className="map-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 12h14" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="map-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="map-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg className="map-compass-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle className="map-compass-ring" cx="16" cy="16" r="13" />
      <path className="map-compass-needle-shadow" d="M16 26l-4.2-9.1L16 6l4.2 10.9L16 26z" />
      <path className="map-compass-needle" d="M16 6l4.2 10.9L16 15.2l-4.2 1.7L16 6z" />
      <path className="map-compass-tail" d="M16 15.2l4.2 1.7L16 26l-4.2-9.1L16 15.2z" />
    </svg>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
