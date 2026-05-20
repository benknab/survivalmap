import type { ComponentChildren, JSX } from "preact";

export function LinkButton(
  { href, children }: { href: string; children: ComponentChildren },
): JSX.Element {
  return <a className="link-button" href={href}>{children}</a>;
}
