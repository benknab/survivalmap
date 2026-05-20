import type { JSX } from "preact";
import { CompassIcon, MinusIcon, PlusIcon } from "./icons.tsx";

type MapControlsProps = {
  cellSize: number;
  zoom: number;
  onZoomChange: (multiplier: number) => void;
};

export function MapControls({ cellSize, zoom, onZoomChange }: MapControlsProps): JSX.Element {
  return (
    <div className="map-control-stack">
      <div className="map-control-panel" aria-label="Map controls">
        <button
          type="button"
          className="map-icon-button"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => onZoomChange(1.18)}
        >
          <PlusIcon />
        </button>
        <button
          type="button"
          className="map-icon-button"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => onZoomChange(1 / 1.18)}
        >
          <MinusIcon />
        </button>
      </div>
      <div className="map-bottom-tools">
        <div className="map-scale" aria-hidden="true">
          <span style={{ width: `${cellSize}px` }} />
          <strong>100m</strong>
          <small>{Math.round(zoom * 100)}% zoom</small>
        </div>
        <div className="map-compass" aria-label="North is up" title="North is up">
          <CompassIcon />
        </div>
      </div>
    </div>
  );
}
