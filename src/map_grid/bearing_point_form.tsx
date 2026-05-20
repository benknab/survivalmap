import type { JSX } from "preact";
import { PointStylePicker } from "./point_style_picker.tsx";
import { PointTypeahead } from "./point_typeahead.tsx";
import type { FormSubmitHandler, MapPoint, PointDraft, PointDraftTextField } from "./types.ts";

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
  onCancel: () => void;
  onRelativePointListOpenChange: (isOpen: boolean) => void;
  onSelectRelativePoint: (point: MapPoint) => void;
};

export function BearingPointForm(props: BearingPointFormProps): JSX.Element {
  return (
    <form className="point-form" onSubmit={props.onSubmit}>
      <p className="point-relative-help">
        Stand at the new point, look at a saved point, then enter that compass bearing and estimated
        distance.
      </p>
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
