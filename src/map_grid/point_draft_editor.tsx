import type { JSX } from "preact";
import { BearingPointForm } from "./bearing_point_form.tsx";
import { ManualPointForm } from "./manual_point_form.tsx";
import type {
  FormSubmitHandler,
  MapPoint,
  PointDraft,
  PointDraftTextField,
  PointFormMode,
} from "./types.ts";

type PointDraftEditorProps = {
  draft: PointDraft;
  relativePointOptions: MapPoint[];
  isRelativePointListOpen: boolean;
  relativePointMessage: string | null;
  relativePointMessageIsError: boolean;
  isLoadingPoints: boolean;
  isSaving: boolean;
  onBearingSubmit: FormSubmitHandler;
  onManualSubmit: FormSubmitHandler;
  onDraftChange: (field: PointDraftTextField, value: string) => void;
  onSwitchMode: (formMode: PointFormMode) => void;
  onCancel: () => void;
  onRelativePointListOpenChange: (isOpen: boolean) => void;
  onSelectRelativePoint: (point: MapPoint) => void;
};

export function PointDraftEditor(props: PointDraftEditorProps): JSX.Element {
  return (
    <>
      <div className="point-form-tabs" role="tablist" aria-label="Point input method">
        <PointFormTab
          mode="bearing"
          activeMode={props.draft.formMode}
          onSwitchMode={props.onSwitchMode}
        />
        <PointFormTab
          mode="manual"
          activeMode={props.draft.formMode}
          onSwitchMode={props.onSwitchMode}
        />
      </div>
      {props.draft.formMode === "bearing"
        ? <BearingPointForm {...props} onSubmit={props.onBearingSubmit} />
        : (
          <ManualPointForm
            draft={props.draft}
            isSaving={props.isSaving}
            onSubmit={props.onManualSubmit}
            onDraftChange={props.onDraftChange}
            onCancel={props.onCancel}
          />
        )}
    </>
  );
}

function PointFormTab(
  { mode, activeMode, onSwitchMode }: {
    mode: PointFormMode;
    activeMode: PointFormMode;
    onSwitchMode: (formMode: PointFormMode) => void;
  },
): JSX.Element {
  const isActive = activeMode === mode;
  const label = mode === "bearing" ? "Bearing" : "Manual";

  return (
    <button
      type="button"
      role="tab"
      className={`point-form-tab${isActive ? " active" : ""}`}
      aria-selected={isActive}
      onClick={() => onSwitchMode(mode)}
    >
      {label}
    </button>
  );
}
