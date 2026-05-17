import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { jsxRenderer } from "hono/jsx-renderer";
import * as z from "zod";
import { db } from "./db.ts";
import { type MapRecord, maps } from "./schema.ts";
import { AppLayout, HomePage, MapNotFoundPage, MapPage } from "./views.tsx";

const port = Number(Deno.env.get("PORT") ?? "8000");

const createMapSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required.")
    .max(80, "Name must be 80 characters or fewer."),
});

type CreateMapInput = z.infer<typeof createMapSchema>;

const app = new Hono();

app.use("*", jsxRenderer(({ children }) => <AppLayout>{children}</AppLayout>));

const routes = app
  .get("/", (context) => context.render(<HomePage />))
  .get("/index.html", (context) => context.render(<HomePage />))
  .get("/api/health", (context) => {
    return context.json({ ok: true, service: "survivalmap" });
  })
  .post(
    "/map",
    zValidator("form", createMapSchema, (result, context) => {
      if (!result.success) {
        context.status(400);
        return context.render(
          <HomePage
            createMapError="Map input is invalid."
            createMapFieldErrors={getCreateMapFieldErrors(result.error)}
          />,
        );
      }
    }),
    async (context) => {
      const input = context.req.valid("form");
      const map = await createMap(input);

      return context.redirect(`/map/${map.id}`, 303);
    },
  )
  .get("/map/:id", async (context) => {
    const id = context.req.param("id");
    const map = await db.select().from(maps).where(eq(maps.id, id)).get();

    if (!map) {
      context.status(404);
      return context.render(<MapNotFoundPage />);
    }

    return context.render(<MapPage map={map} />);
  });

app.notFound((context) => {
  context.status(404);
  return context.render(<MapNotFoundPage />);
});

export type AppType = typeof routes;

Deno.serve({ port }, app.fetch);

async function createMap(input: CreateMapInput): Promise<MapRecord> {
  const map: MapRecord = {
    id: crypto.randomUUID(),
    name: input.name,
  };

  await db.insert(maps).values(map);

  return map;
}

function getCreateMapFieldErrors(
  error: { issues: readonly { path: readonly unknown[]; message: string }[] },
) {
  const nameIssue = error.issues.find((issue) => issue.path[0] === "name");
  return {
    name: nameIssue?.message,
  };
}
