import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getErrorMessage } from "./errors.ts";
import { createPointRequest, fetchPoints, updatePointRequest } from "./point_api.ts";
import type { MapPoint, PointEditInput, PointInput } from "./types.ts";

type UseMapPointsResult = {
  points: MapPoint[];
  isLoadingPoints: boolean;
  queryError: unknown;
  pointError: string | null;
  pendingPointIds: number[];
  isCreatingPoint: boolean;
  isSavingPointEdit: boolean;
  setPointError: (message: string | null) => void;
  createPoint: (point: PointInput) => Promise<boolean>;
  savePointEdit: (pointId: number, point: PointEditInput) => Promise<MapPoint | null>;
  setPointDeleted: (pointId: number, deleted: boolean) => Promise<MapPoint | null>;
};

export function useMapPoints(mapId: string): UseMapPointsResult {
  const queryClient = useQueryClient();
  const pointsQueryKey = ["map-points", mapId] as const;
  const [pointError, setPointError] = useState<string | null>(null);
  const [pendingPointIds, setPendingPointIds] = useState<number[]>([]);
  const pointsQuery = useQuery({
    queryKey: pointsQueryKey,
    queryFn: ({ signal }): Promise<MapPoint[]> => fetchPoints(mapId, signal),
  });
  const createPointMutation = useMutation({
    mutationFn: (point: PointInput): Promise<MapPoint> => createPointRequest(mapId, point),
    onSuccess: (savedPoint): void => {
      queryClient.setQueryData<MapPoint[]>(pointsQueryKey, (currentPoints) => [
        ...(currentPoints ?? []),
        savedPoint,
      ]);
    },
    onError: (error): void => {
      setPointError(getErrorMessage(error, "Could not save point."));
    },
  });
  const savePointEditMutation = useMutation({
    mutationFn: ({ pointId, point }: { pointId: number; point: PointEditInput }) =>
      updatePointRequest(mapId, pointId, point, "Could not update point."),
    onSuccess: cacheUpdatedPoint,
    onError: (error): void => {
      setPointError(getErrorMessage(error, "Could not update point."));
    },
  });
  const updatePointDeletedMutation = useMutation({
    mutationFn: ({ pointId, deleted }: { pointId: number; deleted: boolean }) =>
      updatePointRequest(
        mapId,
        pointId,
        { deleted },
        `Could not ${deleted ? "remove" : "restore"} point.`,
      ),
    onSuccess: cacheUpdatedPoint,
    onError: (error, { deleted }): void => {
      setPointError(getErrorMessage(error, `Could not ${deleted ? "remove" : "restore"} point.`));
    },
  });

  function cacheUpdatedPoint(updatedPoint: MapPoint): void {
    queryClient.setQueryData<MapPoint[]>(
      pointsQueryKey,
      (currentPoints) =>
        currentPoints?.map((point) => point.id === updatedPoint.id ? updatedPoint : point) ?? [
          updatedPoint,
        ],
    );
  }

  async function createPoint(point: PointInput): Promise<boolean> {
    setPointError(null);

    try {
      await createPointMutation.mutateAsync(point);
      return true;
    } catch {
      return false;
    }
  }

  async function savePointEdit(
    pointId: number,
    point: PointEditInput,
  ): Promise<MapPoint | null> {
    setPointError(null);

    try {
      return await savePointEditMutation.mutateAsync({ pointId, point });
    } catch {
      return null;
    }
  }

  async function setPointDeleted(pointId: number, deleted: boolean): Promise<MapPoint | null> {
    if (pendingPointIds.includes(pointId)) {
      return null;
    }

    setPendingPointIds((currentIds) => [...currentIds, pointId]);
    setPointError(null);

    try {
      return await updatePointDeletedMutation.mutateAsync({ pointId, deleted });
    } catch {
      return null;
    } finally {
      setPendingPointIds((currentIds) => currentIds.filter((id) => id !== pointId));
    }
  }

  return {
    points: pointsQuery.data ?? [],
    isLoadingPoints: pointsQuery.isPending,
    queryError: pointsQuery.error,
    pointError,
    pendingPointIds,
    isCreatingPoint: createPointMutation.isPending,
    isSavingPointEdit: savePointEditMutation.isPending,
    setPointError,
    createPoint,
    savePointEdit,
    setPointDeleted,
  };
}
