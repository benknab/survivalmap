import type { ComponentChildren, JSX } from "preact";

type PanelProps = {
  children: ComponentChildren;
  className?: string;
};

export function Panel({ className = "hero", children }: PanelProps): JSX.Element {
  return <section className={className}>{children}</section>;
}
