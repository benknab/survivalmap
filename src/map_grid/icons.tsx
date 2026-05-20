import type { JSX } from "preact";

export function TrashIcon(): JSX.Element {
  return (
    <svg className="point-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

export function RestoreIcon(): JSX.Element {
  return (
    <svg className="point-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 7a7 7 0 1 1-1.8 6.8" />
      <path d="M7 7H3V3" />
    </svg>
  );
}

export function PlusIcon(): JSX.Element {
  return (
    <svg className="map-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function UserPlusIcon(): JSX.Element {
  return (
    <svg className="map-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M18 8v8" />
      <path d="M14 12h8" />
    </svg>
  );
}

export function MinusIcon(): JSX.Element {
  return (
    <svg className="map-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 12h14" />
    </svg>
  );
}

export function ChevronLeftIcon(): JSX.Element {
  return (
    <svg className="map-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon(): JSX.Element {
  return (
    <svg className="map-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function CompassIcon(): JSX.Element {
  return (
    <svg className="map-compass-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle className="map-compass-ring" cx="16" cy="16" r="13" />
      <path className="map-compass-needle-shadow" d="M16 26l-4.2-9.1L16 6l4.2 10.9L16 26z" />
      <path className="map-compass-needle" d="M16 6l4.2 10.9L16 15.2l-4.2 1.7L16 6z" />
      <path className="map-compass-tail" d="M16 15.2l4.2 1.7L16 26l-4.2-9.1L16 15.2z" />
    </svg>
  );
}
