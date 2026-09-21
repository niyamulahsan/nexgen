import { appConfig } from "@/config/index.js";

export const urls = {
  /**
   * Why: Returns normalized app base URL without trailing slash.
   * When: Building absolute links.
   * Where: Mail/reset URL generation.
   * How: Trims trailing slash from the configured app URL.
   */
  appUrl() {
    return appConfig.url.replace(/\/$/, "");
  },

  /**
   * Why: Builds absolute URL from APP_URL and a path.
   * When: Creating links for emails or external callbacks.
   * Where: Auth/password reset and integrations.
   * How: Normalizes slash joining between base and path.
   */
  url(path = "") {
    const base = urls.appUrl();
    if (!path) return base;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  }
};
