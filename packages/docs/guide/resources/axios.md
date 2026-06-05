# Axios

The frontend configures a global axios singleton in `src/resources/src/plugins/axios.ts`. It is imported as a side-effect in `main.ts`:

```ts
import "@/plugins/axios";
```

## Defaults

| Setting | Value |
|---------|-------|
| `baseURL` | `""` (proxied by Vite to `env.APP_URL`) |
| `withCredentials` | `true` (sends cookies) |
| `X-Requested-With` | `XMLHttpRequest` |

## Response interceptor

A 401 response interceptor redirects to `/login` when the session expires:

```ts
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

## Usage

Import axios directly in any component or store:

```ts
import axios from "axios";

const response = await axios.get("/api/users");
```
