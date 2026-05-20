import type { JSX } from "preact";
import { PointStylePicker } from "./point_style_picker.tsx";
import { PointTypeahead } from "./point_typeahead.tsx";
import type {
  FormSubmitHandler,
  MapPoint,
  PointDraft,
  PointDraftTextField,
  RelativeBearingOrigin,
} from "./types.ts";

type BearingPointFormProps = {
  draft: PointDraft;
  relativePointOptions: MapPoint[];
  isRelativePointListOpen: boolean;
  relativePointMessage: string | null;
  relativePointMessageIsError: boolean;
  isLoadingPoints: boolean;
  isSaving: boolean;
  onSubmit: FormSubmitHandler;
  onDraftChange: (field: PointDraftTextField, value: string) => void;
  onSwitchBearingOrigin: (origin: RelativeBearingOrigin) => void;
  onCancel: () => void;
  onRelativePointListOpenChange: (isOpen: boolean) => void;
  onSelectRelativePoint: (point: MapPoint) => void;
};

export function BearingPointForm(props: BearingPointFormProps): JSX.Element {
  const isStandingAtSavedPoint = props.draft.relativeBearingOrigin === "saved-point";
  const helpText = isStandingAtSavedPoint
    ? "Stand at a saved point, look at the new point, then enter that compass bearing " +
      "and estimated distance."
    : "Stand at the new point, look at a saved point, then enter that compass bearing " +
      "and estimated distance.";
  const relativePointLabel = isStandingAtSavedPoint
    ? "Standing at saved point"
    : "Looking at saved point";

  return (
    <form className="point-form" onSubmit={props.onSubmit}>
      <BearingOriginPicker
        selectedOrigin={props.draft.relativeBearingOrigin}
        onChange={props.onSwitchBearingOrigin}
      />
      <p className="point-relative-help">{helpText}</p>
      <label>
        Name
        <input
          name="name"
          maxLength={80}
          required
          autoFocus
          placeholder="Cabin cache"
          value={props.draft.name}
          onInput={(event) => props.onDraftChange("name", event.currentTarget.value)}
        />
      </label>
      <PointStylePicker draft={props.draft} onChange={props.onDraftChange} />
      <PointTypeahead
        draft={props.draft}
        label={relativePointLabel}
        options={props.relativePointOptions}
        isLoading={props.isLoadingPoints}
        isOpen={props.isRelativePointListOpen}
        onOpenChange={props.onRelativePointListOpenChange}
        onDraftChange={props.onDraftChange}
        onSelectPoint={props.onSelectRelativePoint}
      />
      <div className="point-coordinate-grid">
        <label>
          Bearing deg
          <input
            name="relativeBearing"
            type="number"
            step="any"
            placeholder="0-360"
            value={props.draft.relativeBearing}
            onInput={(event) => props.onDraftChange("relativeBearing", event.currentTarget.value)}
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
            value={props.draft.relativeDistance}
            onInput={(event) => props.onDraftChange("relativeDistance", event.currentTarget.value)}
          />
        </label>
        <label>
          Z
          <input
            name="z"
            type="number"
            step="any"
            required
            value={props.draft.z}
            onInput={(event) => props.onDraftChange("z", event.currentTarget.value)}
          />
        </label>
      </div>
      {props.relativePointMessage ? <RelativePointMessage {...props} /> : null}
      <PointFormActions isSaving={props.isSaving} onCancel={props.onCancel} />
    </form>
  );
}

function BearingOriginPicker(
  { selectedOrigin, onChange }: {
    selectedOrigin: RelativeBearingOrigin;
    onChange: (origin: RelativeBearingOrigin) => void;
  },
): JSX.Element {
  return (
    <div className="point-bearing-options" role="group" aria-label="Bearing input direction">
      <BearingOriginButton
        origin="new-point"
        label="Stand at new point"
        selectedOrigin={selectedOrigin}
        onChange={onChange}
      />
      <BearingOriginButton
        origin="saved-point"
        label="Stand at saved point"
        selectedOrigin={selectedOrigin}
        onChange={onChange}
      />
    </div>
  );
}

function BearingOriginButton(
  { origin, label, selectedOrigin, onChange }: {
    origin: RelativeBearingOrigin;
    label: string;
    selectedOrigin: RelativeBearingOrigin;
    onChange: (origin: RelativeBearingOrigin) => void;
  },
): JSX.Element {
  const isSelected = selectedOrigin === origin;

  return (
    <button
      type="button"
      className={`point-bearing-option${isSelected ? " active" : ""}`}
      aria-pressed={isSelected}
      onClick={() => onChange(origin)}
    >
      {label}
    </button>
  );
}

function RelativePointMessage(
  { relativePointMessage, relativePointMessageIsError }: BearingPointFormProps,
): JSX.Element {
  return (
    <p className={`point-relative-help${relativePointMessageIsError ? " error" : ""}`}>
      {relativePointMessage}
    </p>
  );
}

function PointFormActions(
  { isSaving, onCancel }: { isSaving: boolean; onCancel: () => void },
): JSX.Element {
  return (
    <div className="point-form-actions">
      <button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save point"}</button>
      <button type="button" className="secondary-button" disabled={isSaving} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
