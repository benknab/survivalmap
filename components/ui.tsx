import type { ComponentChildren } from "preact";

export type CreateMapFieldErrors = Partial<Record<"name", string>>;

type PanelProps = {
  children: ComponentChildren;
  className?: string;
};

export function Panel({ className = "hero", children }: PanelProps) {
  return <section className={className}>{children}</section>;
}

export function Eyebrow({ children }: { children: ComponentChildren }) {
  return <p className="eyebrow">{children}</p>;
}

export function CreateMapForm(
  { error, fieldErrors = {} }: { error?: string; fieldErrors?: CreateMapFieldErrors },
) {
  return (
    <>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <form action="/map" method="post">
        <label>
          Name
          <input name="name" maxLength={80} required placeholder="Livonia run" />
        </label>
        {fieldErrors.name ? <p className="field-error">{fieldErrors.name}</p> : null}
        <button type="submit">Create map</button>
      </form>
    </>
  );
}

export function LinkButton({ href, children }: { href: string; children: ComponentChildren }) {
  return <a className="link-button" href={href}>{children}</a>;
}
