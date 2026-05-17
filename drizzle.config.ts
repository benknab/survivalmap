import { defineConfig } from "drizzle-kit";
import process from "node:process";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:data/survivalmap.sqlite",
  },
});
