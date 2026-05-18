import { fresh } from "@fresh/plugin-vite";
import { defineConfig } from "vite";
import process from "node:process";

const port = Number(process.env.PORT ?? "8000");

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
