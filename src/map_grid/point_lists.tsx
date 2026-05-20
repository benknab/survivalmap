import type { JSX } from "preact";
import { pointDeleted, pointRestored } from "./constants.ts";
import { RestoreIcon, TrashIcon } from "./icons.tsx";
import { formatCoordinateTuple, formatPointName } from "./point_format.ts";
import type { MapPoint } from "./types.ts";

type PointListsProps = {
  points: MapPoint[];
  activePoints: MapPoint[];
  deletedPoints: MapPoint[];
  selectedPointId: number | null;
  pendingPointIds: number[];
  isLoading: boolean;
  onSelectPoint: (point: MapPoint) => void;
  onUpdatePointDeletedState: (pointId: number, deleted: boolean) => void;
};

export function PointLists(props: PointListsProps): JSX.Element {
  return (
    <>
      {props.isLoading
        ? <p className="point-message">Loading points...</p>
        : props.activePoints.length === 0
        ? (
          <p className="point-message">
            {props.points.length === 0 ? "No points saved yet." : "No active points."}
          </p>
        )
        : <ActivePointList {...props} />}
      {props.deletedPoints.length > 0 ? <DeletedPointList {...props} /> : null}
    </>
  );
}

function ActivePointList(props: PointListsProps): JSX.Element {
  return (
    <ol className="point-list">
      {props.activePoints.map((point) => {
        const isPending = props.pendingPointIds.includes(point.id);
        const isSelected = props.selectedPointId === point.id;

        return (
          <li key={point.id} className={isSelected ? "is-selected" : ""}>
            <button
              type="button"
              className="point-list-select"
              aria-current={isSelected ? "true" : undefined}
              onClick={() => props.onSelectPoint(point)}
            >
              <PointListDetails point={point} />
            </button>
            <button
              type="button"
              className="point-action-button remove"
              aria-label={isPending ? `Removing ${point.name}` : `Remove ${point.name}`}
              title={isPending ? "Removing point" : "Remove point"}
              disabled={isPending}
              onClick={() => props.onUpdatePointDeletedState(point.id, pointDeleted)}
            >
              <TrashIcon />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function DeletedPointList(props: PointListsProps): JSX.Element {
  return (
    <>
      <div className="point-section-title">
        Removed {props.deletedPoints.length === 1 ? "point" : "points"}
      </div>
      <ol className="point-list point-list-removed">
        {props.deletedPoints.map((point) => {
          const isPending = props.pendingPointIds.includes(point.id);

          return (
            <li key={point.id}>
              <PointListDetails point={point} />
              <button
                type="button"
                className="point-action-button"
                aria-label={isPending ? `Restoring ${point.name}` : `Restore ${point.name}`}
                title={isPending ? "Restoring point" : "Restore point"}
                disabled={isPending}
                onClick={() => props.onUpdatePointDeletedState(point.id, pointRestored)}
              >
                <RestoreIcon />
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function PointListDetails({ point }: { point: MapPoint }): JSX.Element {
  return (
    <div className="point-list-details">
      <div className="point-list-title">
        <strong>{formatPointName(point)}</strong>
        <small>({point.addedByNickname})</small>
      </div>
      <span>{formatCoordinateTuple(point, point.z)}</span>
    </div>
  );
}
