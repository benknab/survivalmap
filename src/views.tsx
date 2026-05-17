import type { PropsWithChildren } from "hono/jsx";
import type { MapRecord } from "./schema.ts";
import { styles } from "./styles.ts";

export type CreateMapFieldErrors = Partial<Record<"name", string>>;

type HomePageProps = {
  createMapError?: string;
  createMapFieldErrors?: CreateMapFieldErrors;
};

type PanelProps = PropsWithChildren<{
  className?: string;
}>;

export function HomePage({ createMapError, createMapFieldErrors = {} }: HomePageProps) {
  return (
    <>
      <title>Survival Map</title>
      <Panel>
        <Eyebrow>Server-rendered Deno app</Eyebrow>
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
      <title>{map.name} | Survival Map</title>
      <Panel className="hero map-card">
        <Eyebrow>Player map</Eyebrow>
        <h1>{map.name}</h1>
        <p className="map-id">
          UUID <code>{map.id}</code>
        </p>
        <GridPreview />
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
      <title>Map not found | Survival Map</title>
      <Panel>
        <Eyebrow>Map not found</Eyebrow>
        <h1>No map here</h1>
        <p>The requested map does not exist.</p>
        <LinkButton href="/">Create a map</LinkButton>
      </Panel>
    </>
  );
}

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{styles}</style>
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}

function Panel({ className = "hero", children }: PanelProps) {
  return <section className={className}>{children}</section>;
}

function Eyebrow({ children }: PropsWithChildren) {
  return <p className="eyebrow">{children}</p>;
}

function CreateMapForm(
  { error, fieldErrors }: { error?: string; fieldErrors: CreateMapFieldErrors },
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

function GridPreview() {
  return <div className="grid-preview" aria-label="Empty map grid" />;
}

function LinkButton({ href, children }: PropsWithChildren<{ href: string }>) {
  return <a className="link-button" href={href}>{children}</a>;
}
