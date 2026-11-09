import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(configDir, "../..");

export default defineConfig(({ mode }) => {
  // 1. Load the .env file just like the backend does. Resolve it from the
  // config file so a different process cwd cannot point Vite at the wrong .env.
  const env = loadEnv(mode, projectRoot, "");

  const cacheBase = process.env.LOCALAPPDATA || process.env.TEMP || ".";
  const apiUrl = env.APP_URL || "http://localhost:3000";

  // Match the backend default: Socket.IO is off unless SOCKET=true
  const socketEnabled = env.SOCKET === "true";

  const proxy: Record<string, any> = {
    "/api": { target: apiUrl, changeOrigin: true },
    "/health": { target: apiUrl, changeOrigin: true },
    "/storage": { target: apiUrl, changeOrigin: true }
  };

  if (socketEnabled) {
    proxy["/socket.io"] = { target: apiUrl, changeOrigin: true, ws: true, timeout: 10000 };
  }

  return {
    define: {
      // 3. ALWAYS stringify the value when using Vite define
      // `import.meta.env.*` is inlined into every module in dev as well as in
      // the production bundle, so the UI never depends on a stale global.
      "import.meta.env.VITE_SOCKET_ENABLED": JSON.stringify(socketEnabled),
      __SOCKET_ENABLED__: JSON.stringify(socketEnabled),
      __API_URL__: JSON.stringify(apiUrl)
    },
    root: fileURLToPath(new URL(".", import.meta.url)),
    cacheDir: path.join(cacheBase, "nexwire", "vite-cache", "resources"),
    plugins: [vue()],
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          silenceDeprecations: ["import", "if-function", "global-builtin", "color-functions", "slash-div"]
        }
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
      proxy // /socket.io is only proxied when SOCKET=true
    }
  };
});
