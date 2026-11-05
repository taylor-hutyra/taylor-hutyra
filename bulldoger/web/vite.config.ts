import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH lets the same build serve from GitHub Pages (/repo-name/) or root.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  server: { port: 5173 },
});
