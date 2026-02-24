import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Avoid writing cache into node_modules on Railway
  cacheDir: "/tmp/vite-cache",

  // Allow Railway's generated domain for `vite preview`
  preview: {
    host: true,
    port: 8080,
    allowedHosts: [
      "web-notion-to-nectar-production.up.railway.app",
      // optional: allow any *.up.railway.app host if Railway regenerates domains
      ".up.railway.app",
    ],
  },
});