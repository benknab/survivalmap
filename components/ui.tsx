import type { ComponentChildren } from "preact";

export type CreateMapFieldErrors = Partial<Record<"name" | "nickname", string>>;
export type JoinMapFieldErrors = Partial<Record<"id", string>>;
export type AddUserFieldErrors = Partial<Record<"nickname", string>>;

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
          Map name
          <input name="name" maxLength={80} required placeholder="North ridge run" />
        </label>
        {fieldErrors.name ? <p className="field-error">{fieldErrors.name}</p> : null}
        <label>
          Your nickname
          <input name="nickname" maxLength={60} required placeholder="Ranger" />
        </label>
        {fieldErrors.nickname ? <p className="field-error">{fieldErrors.nickname}</p> : null}
        <button type="submit">Create map</button>
      </form>
    </>
  );
}

export function JoinMapForm(
  { error, fieldErrors = {} }: { error?: string; fieldErrors?: JoinMapFieldErrors },
) {
  return (
    <>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <form action="/map/join" method="post">
        <label>
          Map ID
          <input name="id" required placeholder="Paste a map ID or link" />
        </label>
        {fieldErrors.id ? <p className="field-error">{fieldErrors.id}</p> : null}
        <button type="submit">Use map</button>
      </form>
    </>
  );
}

export function AddUserForm(
  { action, error, fieldErrors = {} }: {
    action: string;
    error?: string;
    fieldErrors?: AddUserFieldErrors;
  },
) {
  return (
    <>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <form action={action} method="post" className="compact-form">
        <label>
          Nickname
          <input name="nickname" maxLength={60} required placeholder="Medic" />
        </label>
        {fieldErrors.nickname ? <p className="field-error">{fieldErrors.nickname}</p> : null}
        <button type="submit">Add person</button>
      </form>
    </>
  );
}

export function LinkButton({ href, children }: { href: string; children: ComponentChildren }) {
  return <a className="link-button" href={href}>{children}</a>;
}
