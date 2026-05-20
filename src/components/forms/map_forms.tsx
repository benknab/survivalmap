import type { JSX } from "preact";

export type CreateMapFieldErrors = Partial<Record<"name" | "nickname", string>>;
export type JoinMapFieldErrors = Partial<Record<"id", string>>;

export function CreateMapForm(
  { error, fieldErrors = {} }: { error?: string; fieldErrors?: CreateMapFieldErrors },
): JSX.Element {
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
): JSX.Element {
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
