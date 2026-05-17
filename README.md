# Survival Map

Survival Map is a no-login companion app for survival games that intentionally offer little or no
in-game map. The goal is not to recreate official maps. It will give players a simple grid, compass
bearings, landmark notes, and points of interest so they can sketch their own map while playing.

## Product Direction

- No accounts, no profiles, and no login flow.
- Player-authored maps only; do not ship recreated copyrighted game maps.
- Minimal information model: grid position, bearing, distance, landmark, note, and POI type.
- Useful on a second screen while playing.
- Local-first by default, with backend APIs added only where they make the app simpler or more
  portable.

## Tech Stack

- Deno 2 for tasks, TypeScript, and the HTTP runtime.
- Fresh for manually wired SSR routes and client islands.
- Drizzle ORM v1 RC with SQLite storage through libSQL.
- Zod for form validation.

## Getting Started

Install Deno 2, then run:

```sh
deno task dev
```

The dev task applies pending Drizzle migrations and starts the app at `http://localhost:8000`. By
default, the local SQLite database lives at `data/survivalmap.sqlite` and is ignored by Git.

## Common Commands

```sh
deno task dev     # Run Fresh with Vite in development
deno task build   # Build Fresh into _fresh/
deno task start   # Run the built Fresh server
deno task check   # Type-check the app
deno task lint    # Run Deno lint
deno task fmt     # Format source files
deno task db:generate --name=<name>  # Generate a Drizzle migration
deno task db:migrate                 # Apply pending Drizzle migrations
```

## Project Structure

```text
main.ts           Fresh app entry, route handlers, and manual route registration
client.ts         Fresh client entry for islands and CSS
vite.config.ts    Fresh Vite plugin configuration
islands/          Client-hydrated island components
components/       Shared server-rendered page and layout components
assets/           CSS imported by the client entry
src/db.ts         Drizzle SQLite connection
src/schema.ts     Drizzle table schema
data/             Local SQLite database directory
drizzle/          Generated Drizzle migrations
deno.json         Deno tasks, imports, lint, and format settings
```

## API

- `POST /map` accepts form data with a `name`, validates it with Zod, creates a map, and redirects
  to `/map/:id`.
- `GET /map/:id` renders a stored map.

Example:

```sh
curl -i -X POST http://localhost:8000/map \
  -H "content-type: application/x-www-form-urlencoded" \
  --data-urlencode "name=Livonia run"
```

## Framework Choice

Use Fresh now. Fresh keeps the app Deno-native while adding manual SSR routes and island hydration
for map tools that need browser-side interactivity. The app still runs as a single Deno process in
production through Fresh's generated `_fresh/server.js` entry.

Type safety for POST bodies still needs runtime validation. The current server validates submitted
form data with Zod before handlers use it.

## Early Roadmap

- Save maps locally in the browser.
- Add import/export for sharing a map file without accounts.
- Support multiple named maps per game/world.
- Add simple measuring tools for bearings, distance rings, and landmark triangulation.
- Add optional server-backed sync only after the local-first flow is useful.
