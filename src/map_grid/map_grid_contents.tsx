import type { JSX } from "preact";
import { DrawerToggle } from "./drawer_toggle.tsx";
import { getErrorMessage } from "./errors.ts";
import { MapCanvas } from "./map_canvas.tsx";
import { MapControls } from "./map_controls.tsx";
import { getPointActions } from "./point_actions.ts";
import { PointPanel } from "./point_panel.tsx";
import {
  getPointTypeaheadOptions,
  getRelativePointMessage,
  getRelativePointResult,
} from "./relative_points.ts";
import type { MapGridProps, MapPoint, PointFormMode } from "./types.ts";
import { useMapPoints } from "./use_map_points.ts";
import { useMapView } from "./use_map_view.ts";
import { usePointEditor } from "./use_point_editor.ts";

export function MapGridContents(
  { mapId, mapName, currentUserId, currentUserNickname, members, addUserError, addUserFieldErrors }:
    MapGridProps,
): JSX.Element {
  const mapView = useMapView();
  const mapPoints = useMapPoints(mapId);
  const editor = usePointEditor();
  const activePoints = mapPoints.points.filter((point) => !point.deletedAt);
  const deletedPoints = mapPoints.points.filter((point) => point.deletedAt);
  const selectedPoint = editor.selectedPointId === null
    ? null
    : activePoints.find((point) => point.id === editor.selectedPointId) ?? null;
  const relativePointResult = editor.pointDraft?.formMode === "bearing"
    ? getRelativePointResult(editor.pointDraft, activePoints)
    : null;
  const relativePointMessage = editor.pointDraft && relativePointResult
    ? getRelativePointMessage(editor.pointDraft, relativePointResult, mapPoints.isLoadingPoints)
    : null;
  const relativePointMessageIsError = Boolean(
    relativePointResult?.error && !mapPoints.isLoadingPoints,
  );
  const relativePointOptions = editor.pointDraft?.formMode === "bearing"
    ? getPointTypeaheadOptions(editor.pointDraft, activePoints)
    : [];
  const visiblePointError = mapPoints.pointError ??
    (mapPoints.queryError ? getErrorMessage(mapPoints.queryError, "Could not load points.") : null);
  const pointActions = getPointActions({
    activePoints,
    selectedPoint,
    pointDraft: editor.pointDraft,
    pointEditDraft: editor.pointEditDraft,
    isCreatingPoint: mapPoints.isCreatingPoint,
    isSavingPointEdit: mapPoints.isSavingPointEdit,
    setPointError: mapPoints.setPointError,
    createPoint: mapPoints.createPoint,
    savePointEdit: mapPoints.savePointEdit,
    setPointDeleted: mapPoints.setPointDeleted,
    clearPointDraft: editor.clearPointDraft,
    updatePointEditSelection: editor.updatePointEditSelection,
    clearPointSelectionFor: editor.clearPointSelectionFor,
  });

  function handleStartPointDraft(): void {
    const targetCoordinate = mapView.cursorPosition?.coordinate ?? mapView.getCenterCoordinate();
    editor.startPointDraft(targetCoordinate);
    mapPoints.setPointError(null);
  }

  function handleSelectPoint(point: MapPoint): void {
    editor.selectPoint(point);
    mapPoints.setPointError(null);
    mapView.centerOnCoordinate(point);
  }

  function handleSwitchPointFormMode(formMode: PointFormMode): void {
    editor.switchPointFormMode(formMode);
    mapPoints.setPointError(null);
  }

  function handleClearPointSelection(): void {
    editor.clearPointSelection();
    mapPoints.setPointError(null);
  }

  function handleResetPointEditDraft(): void {
    editor.resetPointEditDraft(selectedPoint);
    mapPoints.setPointError(null);
  }

  return (
    <div
      className={`map-grid${editor.isDrawerOpen ? "" : " is-drawer-closed"}`}
      aria-label={`${mapName} coordinate map`}
    >
      <MapCanvas
        canvasRef={mapView.canvasRef}
        activePoints={activePoints}
        selectedPointId={editor.selectedPointId}
        hoveredPointId={editor.hoveredPointId}
        view={mapView.view}
        size={mapView.size}
        origin={mapView.origin}
        canvasStyle={mapView.canvasStyle}
        isDragging={mapView.isDragging}
        cursorPosition={mapView.cursorPosition}
        onPointerDown={mapView.handlePointerDown}
        onPointerMove={mapView.handlePointerMove}
        onPointerEnd={mapView.handlePointerEnd}
        onPointerLeave={mapView.handlePointerLeave}
        onWheel={mapView.handleWheel}
        onSelectPoint={handleSelectPoint}
        onPointHoverStart={editor.startPointHover}
        onPointHoverEnd={editor.endPointHover}
      />
      <PointPanel
        mapId={mapId}
        isOpen={editor.isDrawerOpen}
        currentUserId={currentUserId}
        currentUserNickname={currentUserNickname}
        members={members}
        addUserError={addUserError}
        addUserFieldErrors={addUserFieldErrors}
        points={mapPoints.points}
        activePoints={activePoints}
        deletedPoints={deletedPoints}
        selectedPoint={selectedPoint}
        selectedPointId={editor.selectedPointId}
        pointDraft={editor.pointDraft}
        pointEditDraft={editor.pointEditDraft}
        visiblePointError={visiblePointError}
        pendingPointIds={mapPoints.pendingPointIds}
        isLoadingPoints={mapPoints.isLoadingPoints}
        isCreatingPoint={mapPoints.isCreatingPoint}
        isSavingPointEdit={mapPoints.isSavingPointEdit}
        relativePointOptions={relativePointOptions}
        isRelativePointListOpen={editor.isRelativePointListOpen}
        relativePointMessage={relativePointMessage}
        relativePointMessageIsError={relativePointMessageIsError}
        onStartPointDraft={handleStartPointDraft}
        onPointEditSubmit={pointActions.handlePointEditSubmit}
        onManualPointSubmit={pointActions.handleManualPointSubmit}
        onBearingPointSubmit={pointActions.handleBearingPointSubmit}
        onPointDraftChange={editor.updatePointDraft}
        onPointEditChange={editor.updatePointEditDraft}
        onSwitchPointFormMode={handleSwitchPointFormMode}
        onSelectRelativePoint={editor.selectRelativePoint}
        onSelectPoint={handleSelectPoint}
        onClearPointSelection={handleClearPointSelection}
        onResetPointEditDraft={handleResetPointEditDraft}
        onCancelPointDraft={editor.cancelPointDraft}
        onRelativePointListOpenChange={editor.setRelativePointListOpen}
        onUpdatePointDeletedState={pointActions.handleUpdatePointDeletedState}
      />
      <DrawerToggle isOpen={editor.isDrawerOpen} onToggle={editor.toggleDrawer} />
      <MapControls
        cellSize={mapView.cellSize}
        zoom={mapView.view.zoom}
        onZoomChange={mapView.changeZoom}
      />
    </div>
  );
}
