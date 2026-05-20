import type { JSX } from "preact";
import { PointStylePicker } from "./point_style_picker.tsx";
import type { FormSubmitHandler, PointDraft, PointDraftTextField } from "./types.ts";

type ManualPointFormProps = {
  draft: PointDraft;
  isSaving: boolean;
  onSubmit: FormSubmitHandler;
  onDraftChange: (field: PointDraftTextField, value: string) => void;
  onCancel: () => void;
};

export function ManualPointForm(props: ManualPointFormProps): JSX.Element {
  return (
    <form className="point-form" onSubmit={props.onSubmit}>
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
      <div className="point-coordinate-grid">
        <CoordinateInput label="X" name="x" value={props.draft.x} onChange={props.onDraftChange} />
        <CoordinateInput label="Y" name="y" value={props.draft.y} onChange={props.onDraftChange} />
        <CoordinateInput label="Z" name="z" value={props.draft.z} onChange={props.onDraftChange} />
      </div>
      <div className="point-form-actions">
        <button type="submit" disabled={props.isSaving}>
          {props.isSaving ? "Saving..." : "Save point"}
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={props.isSaving}
          onClick={props.onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function CoordinateInput(
  { label, name, value, onChange }: {
    label: string;
    name: "x" | "y" | "z";
    value: string;
    onChange: (field: PointDraftTextField, value: string) => void;
  },
): JSX.Element {
  return (
    <label>
      {label}
      <input
        name={name}
        type="number"
        step="any"
        required
        value={value}
        onInput={(event) => onChange(name, event.currentTarget.value)}
      />
    </label>
  );
}
