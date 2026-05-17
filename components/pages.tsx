import { Head } from "fresh/runtime";
import MapGrid from "../islands/map_grid.tsx";
import type { MapRecord } from "../src/schema.ts";
import { type CreateMapFieldErrors, CreateMapForm, Eyebrow, LinkButton, Panel } from "./ui.tsx";

export type HomePageProps = {
  createMapError?: string;
  createMapFieldErrors?: CreateMapFieldErrors;
};

export function HomePage({ createMapError, createMapFieldErrors = {} }: HomePageProps) {
  return (
    <>
      <Head>
        <title>Survival Map</title>
      </Head>
      <Panel>
        <Eyebrow>Deno Fresh app</Eyebrow>
        <h1>Survival Map</h1>
        <p>
          Create a player-authored survival map and store it in the backend SQLite database. After
          creation, the server redirects to the new map at <code>/map/:id</code>.
        </p>
      </Panel>

      <Panel className="tester">
        <Eyebrow>SQLite storage</Eyebrow>
        <h2>Create a map</h2>
        <CreateMapForm error={createMapError} fieldErrors={createMapFieldErrors} />
      </Panel>
    </>
  );
}

export function MapPage({ map }: { map: MapRecord }) {
  return (
    <>
      <Head>
        <title>{map.name} | Survival Map</title>
      </Head>
      <Panel className="hero map-card">
        <Eyebrow>Player map</Eyebrow>
        <h1>{map.name}</h1>
        <p className="map-id">
          UUID <code>{map.id}</code>
        </p>
        <MapGrid mapName={map.name} />
        <p>
          This map record is loaded from SQLite through Drizzle. Notes, landmarks, bearings, and
          points of interest can be attached to this map next.
        </p>
        <LinkButton href="/">Create another map</LinkButton>
      </Panel>
    </>
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
        <p>The requested map does not exist.</p>
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
