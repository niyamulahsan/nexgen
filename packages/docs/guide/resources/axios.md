# Axios

The frontend configures a global axios singleton in `src/resources/src/plugins/axios.ts`. It is imported as a side-effect in `main.ts`:

```ts
import "@/plugins/axios";
```

## Defaults

| Setting | Value |
|---------|-------|
| `baseURL` | `VITE_API_URL` env var (empty by default — proxied by Vite to `APP_URL`) |
| `withCredentials` | `true` (sends cookies cross-origin) |
| `Accept` | `application/json` |
| `X-Requested-With` | `XMLHttpRequest` |

## 401 interceptor

When a response returns `401` and the current page is not an auth page, axios redirects to `/login` with a `redirect` query param so the user returns to the original page after login:

```ts
// Current page: /dashboard
// 401 response → redirects to /login?redirect=%2Fdashboard
```

Auth pages (`/login`, `/register`, `/forget-password`, `/reset-password`, `/verify-email`) are excluded from the redirect.

## Usage

Import axios directly in any component or store:

```ts
import axios from "axios";

const response = await axios.get("/api/users");
```

Or use it through Gum for SPA-style visits:

```ts
const gum = useGum();
await gum.get("/api/users", { routePath: "/users" });
```
