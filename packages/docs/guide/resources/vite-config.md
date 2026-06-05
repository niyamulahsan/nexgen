# Vite Configuration

`src/resources/vite.config.ts` configures the Vite dev server and build for the frontend SPA.

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { env } from "../env.ts";

const cacheBase = process.env.LOCALAPPDATA || process.env.TEMP || ".";
const apiUrl = env.APP_URL;

const proxy: Record<string, any> = {
  "/api": { target: apiUrl, changeOrigin: true },
  "/health": { target: apiUrl, changeOrigin: true },
  "/storage": { target: apiUrl, changeOrigin: true }
};

proxy["/socket.io"] = { target: apiUrl, changeOrigin: true, ws: true };

export default defineConfig({
  define: { __SOCKET_ENABLED__: env.SOCKET },
  root: "src/resources",
  cacheDir: path.join(cacheBase, "nexgen", "vite-cache", "resources"),
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      scss: { quietDeps: true }
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  build: {
    outDir: "../../public",
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy
  }
});
```

## Key settings

| Setting | Value | Notes |
|---------|-------|-------|
| `root` | `src/resources` | Vite serves from the resources directory |
| `@` alias | `src/` | Maps to `src/resources/src/` |
| `outDir` | `../../public` | Build output goes to the framework's public directory |
| `server.port` | `5173` | Dev server port |
| `__SOCKET_ENABLED__` | `env.SOCKET` | Compile-time constant for Pulse availability |
| `cacheDir` | `%LOCALAPPDATA%/nexgen/vite-cache/resources` | Offloads cache from project directory |

## Proxy

All backend requests are proxied to `env.APP_URL` to avoid CORS issues during development:

| Path | Target | WebSocket |
|------|--------|-----------|
| `/api/*` | `env.APP_URL` | — |
| `/health` | `env.APP_URL` | — |
| `/storage/*` | `env.APP_URL` | — |
| `/socket.io` | `env.APP_URL` | Yes (for Pulse) |
