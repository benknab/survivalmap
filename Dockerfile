# syntax=docker/dockerfile:1

ARG DENO_VERSION=2.6.1

FROM denoland/deno:${DENO_VERSION} AS base
WORKDIR /app
ENV DENO_DIR=/deno-dir

FROM base AS deps
COPY deno.json deno.lock ./
COPY drizzle.config.ts vite.config.ts ./
COPY src ./src
RUN deno cache --frozen src/main.ts src/client.ts vite.config.ts drizzle.config.ts

FROM deps AS build
COPY . .
RUN deno task build

FROM base AS runtime
ENV DATABASE_URL=file:/data/survivalmap.sqlite

COPY --from=build --chown=deno:deno /deno-dir /deno-dir
COPY --from=build --chown=deno:deno /app /app

RUN mkdir -p /data && chown -R deno:deno /app /data

VOLUME ["/data"]
EXPOSE 8000
USER deno

CMD ["deno", "task", "start"]
