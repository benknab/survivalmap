import { Head } from "fresh/runtime";
import type { JSX } from "preact";
import type { MapRecord, UserRecord } from "../../schema.ts";
import { Eyebrow } from "../ui/eyebrow.tsx";
import { LinkButton } from "../ui/link_button.tsx";
import { Panel } from "../ui/panel.tsx";

export type UserSelectPageProps = {
  map: MapRecord;
  users: UserRecord[];
  error?: string;
};

export function UserSelectPage({ map, users, error }: UserSelectPageProps): JSX.Element {
  return (
    <>
      <Head>
        <title>Choose user | {map.name}</title>
      </Head>
      <Panel>
        <Eyebrow>Choose nickname</Eyebrow>
        <h1>{map.name}</h1>
        <p>Pick the nickname you use on this map.</p>
        <p className="map-id">
          Map ID <code>{map.id}</code>
        </p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {users.length > 0
          ? <UserPicker mapId={map.id} users={users} />
          : <p>No people have been added to this map yet.</p>}
        <LinkButton href="/">Return home</LinkButton>
      </Panel>
    </>
  );
}

function UserPicker({ mapId, users }: { mapId: string; users: UserRecord[] }): JSX.Element {
  return (
    <form action={`/map/${mapId}/session`} method="post" className="user-picker">
      {users.map((user) => (
        <button
          key={user.id}
          type="submit"
          name="userId"
          value={user.id}
          className="person-button"
        >
          <span>{user.nickname}</span>
        </button>
      ))}
    </form>
  );
}
