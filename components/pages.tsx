import { Head } from "fresh/runtime";
import MapGrid from "../islands/map_grid.tsx";
import type { MapRecord, UserRecord } from "../src/schema.ts";
import {
  type AddUserFieldErrors,
  AddUserForm,
  type CreateMapFieldErrors,
  CreateMapForm,
  Eyebrow,
  type JoinMapFieldErrors,
  JoinMapForm,
  LinkButton,
  Panel,
} from "./ui.tsx";

export type HomePageProps = {
  currentMaps?: CurrentMap[];
  createMapError?: string;
  createMapFieldErrors?: CreateMapFieldErrors;
  joinMapError?: string;
  joinMapFieldErrors?: JoinMapFieldErrors;
};

export type CurrentMap = {
  id: string;
  name: string;
  userNickname: string;
};

export type MapPageProps = {
  map: MapRecord;
  currentUser: UserRecord;
  users: UserRecord[];
  addUserError?: string;
  addUserFieldErrors?: AddUserFieldErrors;
};

export type UserSelectPageProps = {
  map: MapRecord;
  users: UserRecord[];
  error?: string;
};

export function HomePage(
  {
    currentMaps = [],
    createMapError,
    createMapFieldErrors = {},
    joinMapError,
    joinMapFieldErrors = {},
  }: HomePageProps,
) {
  return (
    <>
      <Head>
        <title>Survival Map</title>
      </Head>
      <Panel>
        <Eyebrow>Shared survival map</Eyebrow>
        <h1>Survival Map</h1>
        <p>
          Make a rough field map for landmarks, bearings, notes, and points of interest. Start a new
          map or join with an ID.
        </p>
      </Panel>

      {currentMaps.length > 0
        ? (
          <Panel className="tester">
            <Eyebrow>Open maps</Eyebrow>
            <h2>Continue a map</h2>
            <ul className="map-list">
              {currentMaps.map((map) => (
                <li key={map.id}>
                  <a href={`/map/${map.id}`}>
                    <span>{map.name}</span>
                    <small>{map.userNickname}</small>
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        )
        : null}

      <Panel className="split-panel">
        <div>
          <Eyebrow>New map</Eyebrow>
          <h2>Start a map</h2>
          <CreateMapForm error={createMapError} fieldErrors={createMapFieldErrors} />
        </div>
        <div>
          <Eyebrow>Existing map</Eyebrow>
          <h2>Join a map</h2>
          <JoinMapForm error={joinMapError} fieldErrors={joinMapFieldErrors} />
        </div>
      </Panel>
    </>
  );
}

export function UserSelectPage({ map, users, error }: UserSelectPageProps) {
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
          ? (
            <form action={`/map/${map.id}/session`} method="post" className="user-picker">
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
          )
          : <p>No people have been added to this map yet.</p>}
        <LinkButton href="/">Return home</LinkButton>
      </Panel>
    </>
  );
}

export function MapPage(
  { map, currentUser, users, addUserError, addUserFieldErrors = {} }: MapPageProps,
) {
  return (
    <>
      <Head>
        <title>{map.name} | Survival Map</title>
      </Head>
      <Panel className="hero map-card">
        <Eyebrow>Player map</Eyebrow>
        <h1>{map.name}</h1>
        <p className="map-id">
          Map ID <code>{map.id}</code>
        </p>
        <p className="current-user">
          Using this map as <strong>{currentUser.nickname}</strong>
        </p>
        <MapGrid mapName={map.name} />
        <p>
          Use the grid for notes, landmarks, bearings, distance estimates, and points of interest.
        </p>
        <LinkButton href="/">Home</LinkButton>
      </Panel>

      <Panel className="tester">
        <Eyebrow>People</Eyebrow>
        <h2>People on this map</h2>
        <UserList users={users} />
        <h3>Add a person</h3>
        <AddUserForm
          action={`/map/${map.id}/users`}
          error={addUserError}
          fieldErrors={addUserFieldErrors}
        />
      </Panel>
    </>
  );
}

function UserList({ users }: { users: UserRecord[] }) {
  return (
    <ul className="user-list">
      {users.map((user) => (
        <li key={user.id}>
          <span>{user.nickname}</span>
        </li>
      ))}
    </ul>
  );
}

export function MapNotFoundPage() {
  return (
    <>
      <Head>
        <title>Map not found | Survival Map</title>
      </Head>
      <Panel>
        <Eyebrow>Map not found</Eyebrow>
        <h1>No map here</h1>
        <p>That map does not exist.</p>
        <LinkButton href="/">Create a map</LinkButton>
      </Panel>
    </>
  );
}

export function ErrorPage() {
  return (
    <>
      <Head>
        <title>Server error | Survival Map</title>
      </Head>
      <Panel>
        <Eyebrow>Server error</Eyebrow>
        <h1>Something broke</h1>
        <p>Try again in a moment.</p>
        <LinkButton href="/">Return home</LinkButton>
      </Panel>
    </>
  );
}
