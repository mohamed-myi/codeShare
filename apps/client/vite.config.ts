import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "monaco",
              test: /node_modules[\\/]monaco-editor[\\/]/,
              priority: 20,
              maxSize: 450_000,
            },
            {
              name: "collaboration",
              test: /node_modules[\\/](socket\.io-client|y-websocket|yjs)[\\/]/,
              priority: 15,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/ws/yjs": {
        target: "ws://localhost:3001",
        ws: true,
      },
      "/ws/socket": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
});
