import type { JSX } from "preact";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons.tsx";

type DrawerToggleProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export function DrawerToggle({ isOpen, onToggle }: DrawerToggleProps): JSX.Element {
  return (
    <button
      type="button"
      className="drawer-toggle-button"
      aria-label={isOpen ? "Close points drawer" : "Open points drawer"}
      aria-expanded={isOpen}
      title={isOpen ? "Close points drawer" : "Open points drawer"}
      onClick={onToggle}
    >
      {isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
}
