import type { JSX } from "preact";

export type AddUserFieldErrors = Partial<Record<"nickname", string>>;

export function AddUserForm(
  { action, error, fieldErrors = {} }: {
    action: string;
    error?: string;
    fieldErrors?: AddUserFieldErrors;
  },
): JSX.Element {
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
