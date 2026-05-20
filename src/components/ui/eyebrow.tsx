import type { ComponentChildren, JSX } from "preact";

export function Eyebrow({ children }: { children: ComponentChildren }): JSX.Element {
  return <p className="eyebrow">{children}</p>;
}
