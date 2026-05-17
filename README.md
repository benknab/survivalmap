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
- Hono for a small full-stack SSR server and API router.
- React rendered on the server for page components.
- Vite can be added later if the app needs bundled client-side TypeScript or hydration.

## Getting Started

Install Deno 2, then run:

```sh
deno task dev
```

The app runs at `http://localhost:8000`.

## Common Commands

```sh
deno task dev     # Run the SSR server with file watching
deno task start   # Run the SSR server without file watching
deno task check   # Type-check the server
deno task lint    # Run Deno lint
deno task fmt     # Format source files
deno task build   # Cache and validate the server entry point
```

## Project Structure

```text
src/main.tsx React SSR page rendering and API routes
deno.json    Deno tasks, imports, lint, and format settings
```

## API

- `GET /api/health` returns basic API status.
- `POST /api/points` accepts JSON or form data and returns a typed JSON response.

Example:

```sh
curl -X POST http://localhost:8000/api/points \
  -H "content-type: application/json" \
  -d '{"name":"Starter base","note":"Testing the typed endpoint"}'
```

## Framework Choice

Use Hono plus React SSR now. Hono keeps this a single Deno instance and handles API routing; React
gives us componentized server-rendered pages without committing to a larger app framework. Fresh is
a better choice only if we want Deno-native file routes and islands. TanStack Start is better only
if we commit to a React-first full-stack app with more framework structure.

Type safety for POST bodies still needs runtime validation. The current server parses unknown
request input into a typed `CreatePointInput` before handlers use it. If the schema grows, add
Valibot or Zod rather than trusting raw JSON.

## Early Roadmap

- Save maps locally in the browser.
- Add import/export for sharing a map file without accounts.
- Support multiple named maps per game/world.
- Add simple measuring tools for bearings, distance rings, and landmark triangulation.
- Add optional server-backed sync only after the local-first flow is useful.
