import { eq } from "drizzle-orm";
import { App, staticFiles } from "fresh";
import { h } from "preact";
import * as z from "zod";
import { AppWrapper } from "./components/app_wrapper.tsx";
import {
  ErrorPage,
  HomePage,
  type HomePageProps,
  MapNotFoundPage,
  MapPage,
} from "./components/pages.tsx";
import type { CreateMapFieldErrors } from "./components/ui.tsx";
import { db } from "./src/db.ts";
import { type MapRecord, maps } from "./src/schema.ts";

const createMapSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required.")
    .max(80, "Name must be 80 characters or fewer."),
});

type CreateMapInput = z.infer<typeof createMapSchema>;

export const app = new App()
  .use(staticFiles())
  .appWrapper(AppWrapper)
  .onError("*", (ctx) => ctx.render(h(ErrorPage, {}), { status: 500 }))
  .get("/", (ctx) => ctx.render(h<HomePageProps>(HomePage, {})))
  .get("/index.html", (ctx) => ctx.render(h<HomePageProps>(HomePage, {})))
  .get("/map", (ctx) => ctx.redirect("/", 303))
  .post("/map", async (ctx) => {
    const form = await ctx.req.formData();
    const result = createMapSchema.safeParse({ name: getFormString(form.get("name")) });

    if (!result.success) {
      return ctx.render(
        h<HomePageProps>(HomePage, {
          createMapError: "Map input is invalid.",
          createMapFieldErrors: getCreateMapFieldErrors(result.error),
        }),
        { status: 400 },
      );
    }

    const map = await createMap(result.data);
    return ctx.redirect(`/map/${map.id}`, 303);
  })
  .get("/map/:id", async (ctx) => {
    const map = await db.select().from(maps).where(eq(maps.id, ctx.params.id)).get();

    if (!map) {
      return ctx.render(h(MapNotFoundPage, {}), { status: 404 });
    }

    return ctx.render(h(MapPage, { map }));
  })
  .notFound((ctx) => ctx.render(h(MapNotFoundPage, {}), { status: 404 }));

async function createMap(input: CreateMapInput): Promise<MapRecord> {
  const map: MapRecord = {
    id: crypto.randomUUID(),
    name: input.name,
  };

  await db.insert(maps).values(map);

  return map;
}

function getFormString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function getCreateMapFieldErrors(
  error: { issues: readonly { path: readonly unknown[]; message: string }[] },
): CreateMapFieldErrors {
  const nameIssue = error.issues.find((issue) => issue.path[0] === "name");
  return {
    name: nameIssue?.message,
  };
}
