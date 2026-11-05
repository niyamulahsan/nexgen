# Vite Configuration

`src/resources/vite.config.ts` configures the Vite dev server and build for the UI SPA.

```ts
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(configDir, "../..");

export default defineConfig(({ mode }) => {
  // Load .env the same way the backend does, from the project root
  const env = loadEnv(mode, projectRoot, "");

  const cacheBase = process.env.LOCALAPPDATA || process.env.TEMP || ".";
  const apiUrl = env.APP_URL || "http://localhost:3000";
  const socketEnabled = env.SOCKET === "true";

  const proxy: Record<string, any> = {
    "/api": { target: apiUrl, changeOrigin: true },
    "/health": { target: apiUrl, changeOrigin: true },
    "/storage": { target: apiUrl, changeOrigin: true },
  };

  // Only proxy the websocket path when realtime is actually on
  if (socketEnabled) {
    proxy["/socket.io"] = { target: apiUrl, changeOrigin: true, ws: true, timeout: 10000 };
  }

  return {
    define: {
      // Vite replace values must be JSON strings, not booleans
      "import.meta.env.VITE_SOCKET_ENABLED": JSON.stringify(socketEnabled),
      __SOCKET_ENABLED__: JSON.stringify(socketEnabled),
      __API_URL__: JSON.stringify(apiUrl),
    },
    root: fileURLToPath(new URL(".", import.meta.url)),
    cacheDir: path.join(cacheBase, "nexwire", "vite-cache", "resources"),
    plugins: [vue()],
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          silenceDeprecations: ["import", "if-function", "global-builtin", "color-functions", "slash-div"],
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      outDir: "../../public",
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      proxy,
    },
  };
});
```

## Sass

The project depends on **`sass`** (pure JavaScript) and deliberately does **not** depend on `sass-embedded`.

Vite resolves its Sass compiler in this order: `sass-embedded` first, then `sass`. `sass-embedded` downloads a native `dart-sass` executable into `node_modules`, and that binary is blocked on machines with Windows Application Control / AppLocker or a strict antivirus policy — the UI then fails on the first `npm run dev` with:

```
[vite] Internal server error: [sass] spawn UNKNOWN
```

Because `sass-embedded` is an *optional peer dependency* of Vite, simply not depending on it is enough: Vite falls back to the pure-JS `sass` package, which needs no executable and works everywhere. The trade-off is slightly slower compilation for larger stylesheets.

If you hit `spawn UNKNOWN` on an older project, the fix is to drop the native package:

```bash
npm uninstall sass-embedded
npm install -D sass
```

## Swapping the UI framework

Only the plugin line changes. Everything else (proxy, build output, defines, aliases) stays the same:

```ts
// Vue (default)
import vue from "@vitejs/plugin-vue";
plugins: [vue()],

// React
import react from "@vitejs/plugin-react";
plugins: [react()],

// Solid
import solid from "vite-plugin-solid";
plugins: [solid()],

// Svelte
import svelte from "@sveltejs/vite-plugin-svelte";
plugins: [svelte()],
```

Then rewrite `src/main.ts` for your framework's entry point.

## Key settings

| Setting              | Value                                        | Notes                                                                     |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| `root`               | Config file's directory (`new URL(".", import.meta.url)`) | Vite serves from `src/resources/` regardless of the process CWD     |
| `@` alias            | `src/`                                       | Maps to `src/resources/src/`                                              |
| `outDir`             | `../../public`                               | Build output goes to the framework's public directory                     |
| `server.port`        | `5173`                                       | Dev server port                                                           |
| `VITE_SOCKET_ENABLED` | `JSON.stringify(env.SOCKET === "true")`      | Boolean inlined into Pulse by both dev and build; must be stringified for Vite `define` |
| `__SOCKET_ENABLED__`  | `JSON.stringify(env.SOCKET === "true")`      | Legacy global kept for compatibility; Pulse reads `VITE_SOCKET_ENABLED`    |
| `__API_URL__`        | `JSON.stringify(env.APP_URL)`                | Compile-time API base URL                                                 |
| `cacheDir`           | `%LOCALAPPDATA%/nexwire/vite-cache/resources` | Offloads cache from project directory                                     |

## Proxy

All backend requests are proxied to `env.APP_URL` to avoid CORS issues during development:

| Path         | Target        | WebSocket       |
| ------------ | ------------- | --------------- |
| `/api/*`     | `env.APP_URL` | —               |
| `/health`    | `env.APP_URL` | —               |
| `/storage/*` | `env.APP_URL` | —               |
| `/socket.io` | `env.APP_URL` | Yes (for Pulse) |

The `/socket.io` entry is only added when `SOCKET` is exactly `"true"`; with realtime disabled there is nothing to proxy, and Vite does not hold a websocket upgrade path open to a server that is not listening on it. This matches the backend default: an unset `SOCKET` means off.

`loadEnv(mode, projectRoot, "")` reads the project `.env` directly (the empty third argument removes Vite's `VITE_` prefix filter), so `APP_URL` and `SOCKET` mean the same thing in the Vite config as they do in the backend. `projectRoot` comes from the config file's own path (`path.resolve(configDir, "../..")`), so starting Vite from another working directory cannot pick up a different `.env`.

The UI never reads `SOCKET` at runtime. `VITE_SOCKET_ENABLED` is inlined into `src/plugins/pulse.ts` by Vite in both dev and build, so `SOCKET=false` produces a no-op Pulse client even after a dev-server restart or a cached `/@vite/env` module. `__SOCKET_ENABLED__` is still emitted for compatibility, but new code should not rely on it.
