import { fresh } from "@fresh/plugin-vite";
import { defineConfig } from "vite";
import process from "node:process";

const port = Number(process.env.PORT ?? "8000");

export default defineConfig({
  plugins: [fresh()],
  server: { port },
});
