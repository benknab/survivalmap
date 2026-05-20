import type { JSX } from "preact";
import { PlusIcon } from "./icons.tsx";
import { PointDraftEditor } from "./point_draft_editor.tsx";
import { PointLists } from "./point_lists.tsx";
import { SelectedPointCard } from "./selected_point_card.tsx";
import type {
  FormSubmitHandler,
  MapPoint,
  PointDraft,
  PointDraftTextField,
  PointEditDraft,
  PointEditField,
  PointFormMode,
} from "./types.ts";

type PointPanelProps = {
  isOpen: boolean;
  points: MapPoint[];
  activePoints: MapPoint[];
  deletedPoints: MapPoint[];
  selectedPoint: MapPoint | null;
  selectedPointId: number | null;
  pointDraft: PointDraft | null;
  pointEditDraft: PointEditDraft | null;
  visiblePointError: string | null;
  pendingPointIds: number[];
  isLoadingPoints: boolean;
  isCreatingPoint: boolean;
  isSavingPointEdit: boolean;
  relativePointOptions: MapPoint[];
  isRelativePointListOpen: boolean;
  relativePointMessage: string | null;
  relativePointMessageIsError: boolean;
  onStartPointDraft: () => void;
  onPointEditSubmit: FormSubmitHandler;
  onManualPointSubmit: FormSubmitHandler;
  onBearingPointSubmit: FormSubmitHandler;
  onPointDraftChange: (field: PointDraftTextField, value: string) => void;
  onPointEditChange: (field: PointEditField, value: string) => void;
  onSwitchPointFormMode: (formMode: PointFormMode) => void;
  onSelectRelativePoint: (point: MapPoint) => void;
  onSelectPoint: (point: MapPoint) => void;
  onClearPointSelection: () => void;
  onResetPointEditDraft: () => void;
  onCancelPointDraft: () => void;
  onRelativePointListOpenChange: (isOpen: boolean) => void;
  onUpdatePointDeletedState: (pointId: number, deleted: boolean) => void;
};

export function PointPanel(props: PointPanelProps): JSX.Element {
  return (
    <div className="point-panel" aria-label="Points of interest" hidden={!props.isOpen}>
      <div className="point-panel-header">
        <strong>
          {props.activePoints.length === 1 ? "1 point" : `${props.activePoints.length} points`}
        </strong>
        <button
          type="button"
          className="map-icon-button point-add-button"
          aria-label="Add point"
          title="Add point"
          onClick={props.onStartPointDraft}
        >
          <PlusIcon />
        </button>
      </div>
      {props.selectedPoint && props.pointEditDraft
        ? (
          <SelectedPointCard
            point={props.selectedPoint}
            draft={props.pointEditDraft}
            isSaving={props.isSavingPointEdit}
            onSubmit={props.onPointEditSubmit}
            onChange={props.onPointEditChange}
            onReset={props.onResetPointEditDraft}
            onDeselect={props.onClearPointSelection}
          />
        )
        : null}
      {props.pointDraft ? <PointPanelDraftEditor {...props} pointDraft={props.pointDraft} /> : null}
      {props.visiblePointError
        ? <p className="point-message error" role="alert">{props.visiblePointError}</p>
        : null}
      <PointLists
        points={props.points}
        activePoints={props.activePoints}
        deletedPoints={props.deletedPoints}
        selectedPointId={props.selectedPointId}
        pendingPointIds={props.pendingPointIds}
        isLoading={props.isLoadingPoints}
        onSelectPoint={props.onSelectPoint}
        onUpdatePointDeletedState={props.onUpdatePointDeletedState}
      />
    </div>
  );
}

function PointPanelDraftEditor(
  { pointDraft, ...props }: PointPanelProps & { pointDraft: PointDraft },
): JSX.Element {
  return (
    <PointDraftEditor
      draft={pointDraft}
      relativePointOptions={props.relativePointOptions}
      isRelativePointListOpen={props.isRelativePointListOpen}
      relativePointMessage={props.relativePointMessage}
      relativePointMessageIsError={props.relativePointMessageIsError}
      isLoadingPoints={props.isLoadingPoints}
      isSaving={props.isCreatingPoint}
      onBearingSubmit={props.onBearingPointSubmit}
      onManualSubmit={props.onManualPointSubmit}
      onDraftChange={props.onPointDraftChange}
      onSwitchMode={props.onSwitchPointFormMode}
      onCancel={props.onCancelPointDraft}
      onRelativePointListOpenChange={props.onRelativePointListOpenChange}
      onSelectRelativePoint={props.onSelectRelativePoint}
    />
  );
}
