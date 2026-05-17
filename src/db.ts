import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.ts";

const databaseUrl = Deno.env.get("DATABASE_URL") ?? "file:data/survivalmap.sqlite";
const client = createClient({ url: databaseUrl });

export const db = drizzle({ client, schema });
