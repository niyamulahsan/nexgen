# Resources (Frontend)

The frontend is a **Vue 3** single-page application built with **Vite**, **Pinia**, and **Vue Router**. It lives under `src/resources/` and is served by the framework's Vite dev server with automatic API, WebSocket, and storage proxy.

This section documents **everything the backend provides to the frontend** — entry point, configuration, routing, pages, layouts, plugins, stores, composables, components, helpers, assets, HTTP client, and validation.

## Project structure

```
src/resources/
├── index.html              # HTML shell
├── vite.config.ts          # Vite dev server & build config
├── src/
│   ├── main.ts             # App entry — mounts Vue with all plugins
│   ├── App.vue             # Root component (<router-view />)
│   ├── plugins/            # Vue plugins (gum, pulse, dialog, axios, routeProgress, browserDetect)
│   ├── router/             # Vue Router configuration & guards
│   ├── stores/             # Pinia stores (auth, admin-ui)
│   ├── composables/        # Shared composable functions (useAuth)
│   ├── layouts/            # Page layouts (dashboard, auth)
│   ├── pages/              # Route-level page components
│   ├── components/         # 19 reusable UI components
│   ├── helpers/            # Utility functions (nformatter, utils)
│   └── assets/             # SCSS theme, CSS, images
```

## Quick reference

| Page | What it covers |
|------|----------------|
| [Entry Point](/guide/resources/entry-point) | `main.ts`, `App.vue`, `index.html`, plugin registration order |
| [Vite Config](/guide/resources/vite-config) | Dev server proxy, aliases, build output, SCSS options |
| [Router](/guide/resources/router) | Route definitions, auth guards, meta flags, route progress |
| [Pages](/guide/resources/pages) | Page components, dashboard & auth examples |
| [Layouts](/guide/resources/layouts) | Dashboard layout (header, sidebar, footer) and auth layout |
| [Plugins](/guide/resources/gum) | Gum, Pulse, Dialog — dedicated guides with full API reference |
| [Stores](/guide/resources/stores) | Auth store and admin-ui Pinia store |
| [Composables](/guide/resources/composables) | `useAuth` composable |
| [Components](/guide/resources/components) | DataTable, Select, Button, Input, Modal, Toast, and 13 more |
| [Helpers](/guide/resources/helpers) | Number formatting and utility functions |
| [Assets & Theme](/guide/resources/assets) | SCSS theme engine, dark/light/auto modes |
| [Axios](/guide/resources/axios) | Global axios config, defaults, 401 interceptor |
| [Validation](/guide/resources/validation) | Zod error handling, field error display |
