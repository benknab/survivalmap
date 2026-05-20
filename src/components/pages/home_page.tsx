import { Head } from "fresh/runtime";
import type { JSX } from "preact";
import type { CurrentMap } from "../../models/current_map.ts";
import {
  type CreateMapFieldErrors,
  CreateMapForm,
  type JoinMapFieldErrors,
  JoinMapForm,
} from "../forms/map_forms.tsx";
import { Eyebrow } from "../ui/eyebrow.tsx";
import { Panel } from "../ui/panel.tsx";

export type HomePageProps = {
  currentMaps?: CurrentMap[];
  createMapError?: string;
  createMapFieldErrors?: CreateMapFieldErrors;
  joinMapError?: string;
  joinMapFieldErrors?: JoinMapFieldErrors;
};

export function HomePage(
  {
    currentMaps = [],
    createMapError,
    createMapFieldErrors = {},
    joinMapError,
    joinMapFieldErrors = {},
  }: HomePageProps,
): JSX.Element {
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

      {currentMaps.length > 0 ? <CurrentMapPanel maps={currentMaps} /> : null}

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

function CurrentMapPanel({ maps }: { maps: CurrentMap[] }): JSX.Element {
  return (
    <Panel className="tester">
      <Eyebrow>Open maps</Eyebrow>
      <h2>Continue a map</h2>
      <ul className="map-list">
        {maps.map((map) => (
          <li key={map.id}>
            <a href={`/map/${map.id}`}>
              <span>{map.name}</span>
              <small>{map.userNickname}</small>
            </a>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
