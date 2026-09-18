import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

function normalizeProxyTarget(value: string | undefined): string {
  const trimmed = value?.trim();
  return (trimmed && trimmed.length > 0 ? trimmed : "http://127.0.0.1:3001").replace(/\/$/, "");
}

export default defineConfig(({ mode }) => {
  const envDir = process.env.E2E_ENV_DIR ?? process.cwd();
  const env = loadEnv(mode, envDir, "");
  const realtimeTarget = normalizeProxyTarget(env.VITE_REALTIME_URL);

  return {
    envDir,
    cacheDir: process.env.E2E_ENV_DIR ? path.join(envDir, "vite-cache") : undefined,
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
      // Shared builds during verification must not reload pages under test.
      watch: process.env.E2E_ENV_DIR ? null : undefined,
      hmr: process.env.E2E_ENV_DIR ? false : undefined,
      port: 5173,
      proxy: {
        "/api": {
          target: realtimeTarget,
          changeOrigin: true,
        },
        "/ws/yjs": {
          target: realtimeTarget,
          ws: true,
        },
        "/ws/socket": {
          target: realtimeTarget,
          ws: true,
        },
      },
    },
  };
});
