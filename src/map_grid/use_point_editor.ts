import { useState } from "react";
import { drawerOpen, relativePointListClosed } from "./constants.ts";
import { createPointDraft, getPointEditDraft } from "./point_drafts.ts";
import { getPointOptionValue } from "./point_format.ts";
import type {
  Coordinate,
  MapPoint,
  PointDraft,
  PointDraftTextField,
  PointEditDraft,
  PointEditField,
  PointFormMode,
} from "./types.ts";

type UsePointEditorResult = {
  isDrawerOpen: boolean;
  pointDraft: PointDraft | null;
  selectedPointId: number | null;
  pointEditDraft: PointEditDraft | null;
  hoveredPointId: number | null;
  isRelativePointListOpen: boolean;
  toggleDrawer: () => void;
  startPointDraft: (targetCoordinate: Coordinate) => void;
  updatePointDraft: (field: PointDraftTextField, value: string) => void;
  switchPointFormMode: (formMode: PointFormMode) => void;
  selectRelativePoint: (point: MapPoint) => void;
  selectPoint: (point: MapPoint) => void;
  updatePointEditDraft: (field: PointEditField, value: string) => void;
  resetPointEditDraft: (selectedPoint: MapPoint | null) => void;
  clearPointSelection: () => void;
  clearPointSelectionFor: (pointId: number) => void;
  cancelPointDraft: () => void;
  clearPointDraft: () => void;
  updatePointEditSelection: (point: MapPoint) => void;
  setRelativePointListOpen: (isOpen: boolean) => void;
  startPointHover: (pointId: number) => void;
  endPointHover: (pointId: number) => void;
};

export function usePointEditor(): UsePointEditorResult {
  const [isDrawerOpen, setIsDrawerOpen] = useState(drawerOpen);
  const [pointDraft, setPointDraft] = useState<PointDraft | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [pointEditDraft, setPointEditDraft] = useState<PointEditDraft | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<number | null>(null);
  const [isRelativePointListOpen, setIsRelativePointListOpen] = useState(relativePointListClosed);

  function toggleDrawer(): void {
    setIsDrawerOpen((open) => !open);
  }

  function startPointDraft(targetCoordinate: Coordinate): void {
    setSelectedPointId(null);
    setPointEditDraft(null);
    setPointDraft(createPointDraft(targetCoordinate));
    setIsRelativePointListOpen(relativePointListClosed);
  }

  function updatePointDraft(field: PointDraftTextField, value: string): void {
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

  function switchPointFormMode(formMode: PointFormMode): void {
    setPointDraft((currentDraft) => currentDraft ? { ...currentDraft, formMode } : null);
    setIsRelativePointListOpen(relativePointListClosed);
  }

  function selectRelativePoint(point: MapPoint): void {
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
    setIsRelativePointListOpen(relativePointListClosed);
  }

  function selectPoint(point: MapPoint): void {
    setIsDrawerOpen(drawerOpen);
    setPointDraft(null);
    setIsRelativePointListOpen(relativePointListClosed);
    setSelectedPointId(point.id);
    setPointEditDraft(getPointEditDraft(point));
  }

  function updatePointEditDraft(field: PointEditField, value: string): void {
    setPointEditDraft((currentDraft) => currentDraft ? { ...currentDraft, [field]: value } : null);
  }

  function resetPointEditDraft(selectedPoint: MapPoint | null): void {
    if (selectedPoint) {
      setPointEditDraft(getPointEditDraft(selectedPoint));
    }
  }

  function clearPointSelection(): void {
    setSelectedPointId(null);
    setPointEditDraft(null);
  }

  function clearPointSelectionFor(pointId: number): void {
    setSelectedPointId((currentId) => currentId === pointId ? null : currentId);
  }

  function cancelPointDraft(): void {
    setPointDraft(null);
    setIsRelativePointListOpen(relativePointListClosed);
  }

  function clearPointDraft(): void {
    setPointDraft(null);
    setIsRelativePointListOpen(relativePointListClosed);
  }

  function updatePointEditSelection(point: MapPoint): void {
    setPointEditDraft(getPointEditDraft(point));
    setSelectedPointId(point.id);
  }

  function setRelativePointListOpen(isOpen: boolean): void {
    setIsRelativePointListOpen(isOpen);
  }

  function startPointHover(pointId: number): void {
    setHoveredPointId(pointId);
  }

  function endPointHover(pointId: number): void {
    setHoveredPointId((currentId) => currentId === pointId ? null : currentId);
  }

  return {
    isDrawerOpen,
    pointDraft,
    selectedPointId,
    pointEditDraft,
    hoveredPointId,
    isRelativePointListOpen,
    toggleDrawer,
    startPointDraft,
    updatePointDraft,
    switchPointFormMode,
    selectRelativePoint,
    selectPoint,
    updatePointEditDraft,
    resetPointEditDraft,
    clearPointSelection,
    clearPointSelectionFor,
    cancelPointDraft,
    clearPointDraft,
    updatePointEditSelection,
    setRelativePointListOpen,
    startPointHover,
    endPointHover,
  };
}
