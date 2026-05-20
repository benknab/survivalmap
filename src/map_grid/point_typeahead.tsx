import type { JSX } from "preact";
import { relativePointListClosed, relativePointListOpen } from "./constants.ts";
import { formatCoordinateTuple, formatPointName } from "./point_format.ts";
import type { MapPoint, PointDraft } from "./types.ts";

type PointTypeaheadProps = {
  draft: PointDraft;
  options: MapPoint[];
  isLoading: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDraftChange: (field: "relativePointQuery", value: string) => void;
  onSelectPoint: (point: MapPoint) => void;
};

export function PointTypeahead(props: PointTypeaheadProps): JSX.Element {
  return (
    <div className="point-typeahead-field">
      <label htmlFor="relative-point-query">Looking at saved point</label>
      <div className="point-typeahead">
        <input
          id="relative-point-query"
          name="relativePointQuery"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="relative-point-options"
          aria-expanded={props.isOpen}
          autoComplete="off"
          placeholder="Search saved points"
          value={props.draft.relativePointQuery}
          onFocus={() => props.onOpenChange(relativePointListOpen)}
          onClick={() => props.onOpenChange(relativePointListOpen)}
          onBlur={() => props.onOpenChange(relativePointListClosed)}
          onInput={(event) => {
            props.onDraftChange("relativePointQuery", event.currentTarget.value);
            props.onOpenChange(relativePointListOpen);
          }}
        />
        {props.isOpen ? <PointTypeaheadList {...props} /> : null}
      </div>
    </div>
  );
}

function PointTypeaheadList(props: PointTypeaheadProps): JSX.Element {
  return (
    <div id="relative-point-options" className="point-typeahead-list" role="listbox">
      {props.isLoading
        ? <div className="point-typeahead-empty">Loading points...</div>
        : props.options.length > 0
        ? props.options.map((point) => (
          <button
            key={point.id}
            type="button"
            className="point-typeahead-option"
            role="option"
            aria-selected={props.draft.relativePointId === point.id}
            onPointerDown={(event) => {
              event.preventDefault();
              props.onSelectPoint(point);
            }}
          >
            <strong>{formatPointName(point)}</strong>
            <span>{formatCoordinateTuple(point, point.z)}</span>
          </button>
        ))
        : <div className="point-typeahead-empty">No matching points.</div>}
    </div>
  );
}
