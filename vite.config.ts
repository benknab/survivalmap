import { fresh } from "@fresh/plugin-vite";
import { defineConfig } from "vite";

const port = Number(Deno.env.get("PORT") ?? "8000");

export default defineConfig({
  plugins: [
    fresh({
      serverEntry: "src/main.ts",
      clientEntry: "src/client.ts",
      islandsDir: "src/islands",
      routeDir: "src/routes",
    }),
  ],
  server: { port },
});
