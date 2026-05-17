import { useState } from "react";

type MapGridProps = {
  mapName: string;
};

export default function MapGrid({ mapName }: MapGridProps) {
  const [bearing, setBearing] = useState(45);
  const [distance, setDistance] = useState(480);
  const ringSize = distance / 8;

  return (
    <div className="map-grid">
      <div className="grid-preview" aria-label={`Empty map grid for ${mapName}`}>
        <div
          className="distance-ring"
          style={{ width: `${ringSize}px`, height: `${ringSize}px` }}
          aria-hidden="true"
        />
        <div
          className="bearing-line"
          style={{ transform: `translate(-50%, -50%) rotate(${bearing}deg)` }}
          aria-hidden="true"
        />
        <div className="grid-origin" aria-hidden="true" />
      </div>

      <div className="map-tools" aria-label="Map measuring controls">
        <button
          type="button"
          className="secondary-button"
          onClick={() => setBearing((bearing + 315) % 360)}
        >
          -45 deg
        </button>
        <p className="map-readout">Bearing {bearing} deg</p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setBearing((bearing + 45) % 360)}
        >
          +45 deg
        </button>
        <label className="range-control">
          Distance estimate: {distance} m
          <input
            type="range"
            min="120"
            max="960"
            step="40"
            value={distance}
            onInput={(event) => setDistance(Number(event.currentTarget.value))}
          />
        </label>
      </div>
    </div>
  );
}
