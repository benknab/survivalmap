import type { JSX } from "preact";
import { pointColorOptions, pointEmojiOptions } from "../point_style.ts";
import type { PointEditDraft, PointStyleField } from "./types.ts";

type PointStylePickerProps = {
  draft: Pick<PointEditDraft, "emoji" | "color">;
  onChange: (field: PointStyleField, value: string) => void;
};

export function PointStylePicker({ draft, onChange }: PointStylePickerProps): JSX.Element {
  return (
    <div className="point-style-picker">
      <div>
        <span className="point-picker-label">Emoji</span>
        <div className="point-picker-options" role="group" aria-label="Point emoji">
          {pointEmojiOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="point-picker-button point-emoji-picker-button"
              aria-label={`${option.label} emoji`}
              aria-pressed={draft.emoji === option.value}
              title={option.label}
              onClick={() => onChange("emoji", option.value)}
            >
              {option.value}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="point-picker-label">Color</span>
        <div className="point-picker-options" role="group" aria-label="Point color">
          {pointColorOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="point-picker-button point-color-picker-button"
              aria-label={`${option.label} point color`}
              aria-pressed={draft.color === option.value}
              title={option.label}
              onClick={() => onChange("color", option.value)}
            >
              <span style={{ backgroundColor: option.value }} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
