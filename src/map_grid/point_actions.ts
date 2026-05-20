import type { JSX } from "preact";
import { getRelativePointResult } from "./relative_points.ts";
import type { MapPoint, PointDraft, PointEditDraft, PointEditInput, PointInput } from "./types.ts";

type PointActionInputs = {
  activePoints: MapPoint[];
  selectedPoint: MapPoint | null;
  pointDraft: PointDraft | null;
  pointEditDraft: PointEditDraft | null;
  isCreatingPoint: boolean;
  isSavingPointEdit: boolean;
  setPointError: (message: string | null) => void;
  createPoint: (point: PointInput) => Promise<boolean>;
  savePointEdit: (pointId: number, point: PointEditInput) => Promise<MapPoint | null>;
  setPointDeleted: (pointId: number, deleted: boolean) => Promise<MapPoint | null>;
  clearPointDraft: () => void;
  updatePointEditSelection: (point: MapPoint) => void;
  clearPointSelectionFor: (pointId: number) => void;
};

type PointActions = {
  handlePointEditSubmit: (event: JSX.TargetedSubmitEvent<HTMLFormElement>) => void;
  handleManualPointSubmit: (event: JSX.TargetedSubmitEvent<HTMLFormElement>) => void;
  handleBearingPointSubmit: (event: JSX.TargetedSubmitEvent<HTMLFormElement>) => void;
  handleUpdatePointDeletedState: (pointId: number, deleted: boolean) => void;
};

export function getPointActions(input: PointActionInputs): PointActions {
  function handlePointEditSubmit(event: JSX.TargetedSubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void savePointEdit(input);
  }

  function handleManualPointSubmit(event: JSX.TargetedSubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void saveManualPoint(input);
  }

  function handleBearingPointSubmit(event: JSX.TargetedSubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void saveBearingPoint(input);
  }

  function handleUpdatePointDeletedState(pointId: number, deleted: boolean): void {
    void updatePointDeletedState(input, pointId, deleted);
  }

  return {
    handlePointEditSubmit,
    handleManualPointSubmit,
    handleBearingPointSubmit,
    handleUpdatePointDeletedState,
  };
}

async function savePointEdit(input: PointActionInputs): Promise<void> {
  if (!input.selectedPoint || !input.pointEditDraft || input.isSavingPointEdit) {
    return;
  }

  const nextPoint: PointEditInput = {
    name: input.pointEditDraft.name.trim(),
    emoji: input.pointEditDraft.emoji,
    color: input.pointEditDraft.color,
  };

  if (!nextPoint.name) {
    input.setPointError("Enter a point name.");
    return;
  }

  const updatedPoint = await input.savePointEdit(input.selectedPoint.id, nextPoint);
  if (updatedPoint) {
    input.updatePointEditSelection(updatedPoint);
  }
}

async function saveManualPoint(input: PointActionInputs): Promise<void> {
  if (!input.pointDraft || input.isCreatingPoint) {
    return;
  }

  const nextPoint: PointInput = {
    name: input.pointDraft.name.trim(),
    emoji: input.pointDraft.emoji,
    color: input.pointDraft.color,
    x: Number(input.pointDraft.x),
    y: Number(input.pointDraft.y),
    z: Number(input.pointDraft.z),
  };

  if (!nextPoint.name || !isFinitePoint(nextPoint)) {
    input.setPointError("Enter a point name and numeric X, Y, and Z coordinates.");
    return;
  }

  if (await input.createPoint(nextPoint)) {
    input.clearPointDraft();
  }
}

async function saveBearingPoint(input: PointActionInputs): Promise<void> {
  if (!input.pointDraft || input.isCreatingPoint) {
    return;
  }

  const relativeResult = getRelativePointResult(input.pointDraft, input.activePoints);
  if (!relativeResult.coordinate) {
    input.setPointError(relativeResult.error ?? "Enter a saved point, bearing, and distance.");
    return;
  }

  const nextPoint: PointInput = {
    name: input.pointDraft.name.trim(),
    emoji: input.pointDraft.emoji,
    color: input.pointDraft.color,
    x: relativeResult.coordinate.x,
    y: relativeResult.coordinate.y,
    z: Number(input.pointDraft.z),
  };

  if (!nextPoint.name || !Number.isFinite(nextPoint.z)) {
    input.setPointError("Enter a point name and numeric Z coordinate.");
    return;
  }

  if (await input.createPoint(nextPoint)) {
    input.clearPointDraft();
  }
}

async function updatePointDeletedState(
  input: PointActionInputs,
  pointId: number,
  deleted: boolean,
): Promise<void> {
  const updatedPoint = await input.setPointDeleted(pointId, deleted);
  if (updatedPoint?.deletedAt) {
    input.clearPointSelectionFor(updatedPoint.id);
  }
}

function isFinitePoint(point: PointInput): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);
}
