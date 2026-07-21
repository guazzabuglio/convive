import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During local dev (npm run dev), this proxies API calls to your local Mealie
// and the WebSocket server. In production, nginx inside the Docker container
// handles the proxying instead.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/mealie": {
        target: process.env.VITE_MEALIE_URL || "http://localhost:9000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mealie/, ""),
      },
      "/ws": {
        target: "ws://localhost:8765",
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, ""),
      },
    },
  },
});
