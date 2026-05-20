import type { JSX } from "preact";
import { formatCoordinateTuple } from "./point_format.ts";
import { PointStylePicker } from "./point_style_picker.tsx";
import type { FormSubmitHandler, MapPoint, PointEditDraft, PointEditField } from "./types.ts";

type SelectedPointCardProps = {
  point: MapPoint;
  draft: PointEditDraft;
  isSaving: boolean;
  onSubmit: FormSubmitHandler;
  onChange: (field: PointEditField, value: string) => void;
  onReset: () => void;
  onDeselect: () => void;
};

export function SelectedPointCard(props: SelectedPointCardProps): JSX.Element {
  return (
    <section className="point-selected-card" aria-label="Selected point">
      <div className="point-selected-header">
        <span>Selected</span>
        <button type="button" className="point-selected-close" onClick={props.onDeselect}>
          Deselect
        </button>
      </div>
      <form className="point-form" onSubmit={props.onSubmit}>
        <label>
          Name
          <input
            name="selectedName"
            maxLength={80}
            required
            value={props.draft.name}
            onInput={(event) => props.onChange("name", event.currentTarget.value)}
          />
        </label>
        <PointStylePicker draft={props.draft} onChange={props.onChange} />
        <p className="point-selected-coordinate">
          {formatCoordinateTuple(props.point, props.point.z)} by {props.point.addedByNickname}
        </p>
        <div className="point-form-actions">
          <button type="submit" disabled={props.isSaving}>
            {props.isSaving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={props.isSaving}
            onClick={props.onReset}
          >
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}
