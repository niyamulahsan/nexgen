import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // 1. Load the .env file just like the backend does
  const env = loadEnv(mode, process.cwd(), "");

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
