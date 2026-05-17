# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Intent

This is a no-login, full-stack companion map app for survival games with little or no built-in map.
Keep the app focused on player-authored notes, compass bearings, distance estimates, landmarks, and
points of interest on a simple grid.

Do not turn this into an official map clone. Avoid checked-in recreated game maps, scraped
coordinates, copyrighted map images, or account/auth features unless the user explicitly asks for
them.

## Architecture

- `main.ts` owns the Fresh app setup and manual route registration.
- `components/` owns server-rendered page components; `islands/` owns client-hydrated interactive
  UI.
- The app should run as a single Deno process unless there is a concrete reason to split services.
- Keep request/response validation near the route until a shared schema module is clearly useful.
- `deno.json` is the source of truth for tasks and imports.

## Commands

Run these from the repository root:

```sh
deno task dev
deno task check
deno task lint
deno task fmt
deno task build
deno task start
```

## Development Rules

- Prefer Deno tasks over adding npm scripts.
- Do not add `package.json` unless there is a concrete tooling need.
- Prefer manual Fresh route wiring in `main.ts` for server routes in the current architecture.
- Use backend JSX components for SSR pages when component structure helps readability.
- Do not add TanStack or another app framework unless the product needs its extra structure.
- Keep the frontend local-first where practical.
- Keep the app usable without authentication.
- Validate unknown request input before treating it as typed data.
- Make the smallest correct change and preserve the existing Deno-first setup.
- Verify meaningful changes with `deno task check`, `deno task lint`, and `deno task build`.
