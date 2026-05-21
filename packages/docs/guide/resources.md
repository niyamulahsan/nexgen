# Resources (Frontend)

## Overview

The frontend is a **Vue 3** single-page application built with **Vite**, **Pinia**, and **Vue Router**. It lives under `src/resources/` and is served by the framework's Vite dev server with automatic API, WebSocket, and storage proxy.

```
src/resources/
├── index.html
├── vite.config.ts
├── src/
│   ├── main.ts              # App entry — mounts Vue with all plugins
│   ├── App.vue               # Root component (<router-view />)
│   ├── plugins/              # Global Vue plugins
│   ├── router/               # Vue Router configuration
│   ├── stores/               # Pinia stores
│   ├── composables/          # Shared composable functions
│   ├── layouts/              # Page layouts (dashboard, auth)
│   ├── pages/                # Route-level page components
│   ├── components/           # Reusable UI components
│   ├── helpers/              # Utility functions
│   └── assets/               # SCSS theme, CSS, images
```

## Entry Point

`src/resources/src/main.ts` bootstraps everything:

```ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import { createHead } from "@vueuse/head";

import App from "./App.vue";
import router from "./router";

import { DialogPlugin } from "@/plugins/dialog";
import { PulsePlugin } from "@/plugins/pulse";
import { GumPlugin } from "@/plugins/gum";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(createHead({ titleTemplate: (t) => (t ? `${t} | Nexgen` : "Nexgen") }));

app.use(DialogPlugin);
app.use(GumPlugin);
app.use(PulsePlugin);

app.mount("#app");
```

### Plugins

Plugins are registered in `main.ts` via `app.use()`. Each plugin adds global functionality:

| Plugin | File | What it provides |
|---|---|---|
| Pinia | `stores/` | State management with `useAuthStore()`, `useAdminUiStore()` |
| Vue Router | `router/` | Navigation, lazy-loaded routes, auth guards |
| `@vueuse/head` | — | Reactive document head management (`<title>`, `<meta>`) |
| DialogPlugin | `plugins/dialog.ts` | `$dialog.alert()`, `$dialog.confirm()`, `$dialog.prompt()` |
| PulsePlugin | `plugins/pulse.ts` | Socket.IO real-time channels via `$pulse.channel(name)` |
| GumPlugin | `plugins/gum.ts` | Inertia-style page visits and form handling |

### Axios (Singleton, not a plugin)

```ts
import "@/plugins/axios";
```

This import configures the global axios defaults — `baseURL`, `withCredentials: true`, `X-Requested-With` header — and adds a 401 response interceptor that redirects to `/login`.

## Router

Routes are defined in `src/resources/src/router/index.ts`:

```ts
import { createRouter, createWebHistory } from "vue-router";
import { setupRouteProgress } from "@/plugins/routeProgress";
import { useAuthStore } from "@/stores/auth";

export const routes = [
  {
    path: "/",
    name: "dashlayout",
    component: () => import("@/layouts/Layout/index.vue"),
    redirect: { path: "/" },
    children: [
      {
        path: "/",
        name: "dashboard",
        component: () => import("@/pages/dashboard/index.vue"),
        meta: { requiresAuth: true }
      },
      // Add your authenticated pages here
    ]
  },
  {
    path: "/login",
    name: "authlayout",
    component: () => import("@/layouts/AuthLayout.vue"),
    children: [
      { path: "/login", name: "login", component: () => import("@/pages/auth/login.vue"), meta: { guestOnly: true } },
      { path: "/register", name: "register", component: () => import("@/pages/auth/register.vue"), meta: { guestOnly: true } },
      { path: "/forget-password", name: "forget-password", component: () => import("@/pages/auth/forgetPassword.vue"), meta: { guestOnly: true } },
      { path: "/reset-password", name: "reset-password", component: () => import("@/pages/auth/resetPassword.vue"), meta: { guestOnly: true } },
      { path: "/verify-email", name: "verify-email", component: () => import("@/pages/auth/verifyEmail.vue"), meta: { guestOnly: true } },
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  }
});

setupRouteProgress(router);

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.bootstrap();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { path: "/" };
  }
  return true;
});

export default router;
```

### Route meta flags

| Flag | Purpose |
|---|---|
| `requiresAuth: true` | Redirects to `/login` if unauthenticated |
| `guestOnly: true` | Redirects to `/` if already authenticated |

### Adding a new page

```ts
// 1. Add a route child under "dashlayout"
children: [
  {
    path: "/posts",
    name: "posts",
    component: () => import("@/pages/posts/index.vue"),
    meta: { requiresAuth: true }
  },
]

// 2. Create the page component
// src/resources/src/pages/posts/index.vue
```

### Route progress bar

`setupRouteProgress(router)` adds a thin gradient progress bar at the top of the page that animates on navigation start and completes on navigation end.

## Pages

Pages are single-file components under `src/resources/src/pages/`. Each page is lazy-loaded by the router.

### Dashboard page example

```vue
<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { pulse } from "@/plugins/pulse";

const auth = useAuthStore();

if (auth.user) {
  const channel = pulse.channel(`user:${auth.user.id}`);
  channel.listen("notification.created", (payload: any) => {
    // handle real-time notification
  });
}
</script>

<template>
  <div class="row">
    <div class="col-12">
      <h1>Welcome, {{ auth.user?.name }}</h1>
    </div>
  </div>
</template>
```

### Auth page example

```vue
<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import Button from "@/components/Button.vue";

const auth = useAuthStore();
const router = useRouter();

const form = ref({ email: "", password: "" });

async function handleLogin() {
  await auth.login(form.value);
  const redirect = router.currentRoute.value.query.redirect as string;
  router.push(redirect || "/");
}
</script>

<template>
  <form @submit.prevent="handleLogin">
    <Input v-model="form.email" label="Email" type="email" />
    <InputPasswordToggle v-model="form.password" label="Password" />
    <Button label="Sign In" type="submit" block />
  </form>
</template>
```

## Stores (Pinia)

### Auth Store

```ts
import { defineStore } from "pinia";
import { useAuth } from "@/composables/useAuth";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as any,
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
  },
  actions: {
    async bootstrap() {
      // called on every route navigation — checks existing session
    },
    async login(credentials: { email: string; password: string }) { /* ... */ },
    async register(data: any) { /* ... */ },
    async logout() { /* ... */ },
    async forgotPassword(email: string) { /* ... */ },
    async resetPassword(data: any) { /* ... */ },
    async verifyEmail(data: any) { /* ... */ },
  }
});
```

### UI Store

```ts
export const useAdminUiStore = defineStore("admin-ui", {
  state: () => ({
    sidebarOpen: true,
    themeMode: "light" as "light" | "dark" | "auto",
  }),
  actions: {
    toggleSidebar() { /* ... */ },
    toggleTheme() { /* ... */ },
  }
});
```

## Plugins

### Pulse (Socket.IO)

Pulse is a **Socket.IO client wrapper** with a channel-based API. It auto-connects on first `channel()` call and conditionally disables itself when `SOCKET=false` (compile-time `__SOCKET_ENABLED__` flag).

```ts
import { pulse } from "@/plugins/pulse";
```

#### `pulse` API

| Method | Purpose |
|---|---|
| `pulse.channel(name)` | Join a room and get a channel for listening. Auto-connects the socket if not connected. Emits `"join"` to the server. |
| `pulse.private(name)` | Alias for `channel("private:<name>")`. Use for user-specific rooms. |
| `pulse.leave(room)` | Leave a room and remove **all** event listeners registered for that room. |
| `pulse.connect()` | Explicitly connect the Socket.IO socket (usually not needed — `channel()` auto-connects). |
| `pulse.disconnect()` | Disconnect the socket entirely. Clears the connection until the next `channel()` call. |

#### `channel` API

```ts
const channel = pulse.channel("user:42");
```

| Method | Purpose |
|---|---|
| `channel.listen(event, callback)` | Register a listener for a named event on this channel. Returns the channel for chaining. |
| `channel.stopListening(event, callback?)` | Remove a specific listener, or all listeners for this event if no callback given. Returns the channel. |

#### Room strategy

The server auto-joins authenticated sockets to:
- `"auth"` — all authenticated clients
- `"user:<userId>"` — individual user
- `"role:<roleName>"` — all users with a specific role
- `"guest"` — unauthenticated clients
- Custom rooms via client `"join"` event

#### Example

```ts
import { pulse } from "@/plugins/pulse";

// Listen for notifications specific to current user
const channel = pulse.channel(`user:${userId}`);
channel.listen("notification.created", (data) => {
  showToast(data.title);
});

// Listen for admin-wide broadcasts
const adminChannel = pulse.channel("role:admin");
adminChannel.listen("admin.alert", (data) => {
  showAlert(data.message);
});

// Clean up on page leave
onUnmounted(() => {
  channel.stopListening("notification.created");
  pulse.leave(`user:${userId}`);
});
```

### Gum (Page Visits & Forms)

Gum provides an **Inertia-like API** for programmatic page visits and form handling using axios and Vue Router. It handles navigation, loading state, validation errors, upload progress, and persistent page state.

```ts
import { useGum, useGumForm, useGumRemember } from "@/plugins/gum";
```

#### `useGum()` — Page Visits

Use for GET requests that navigate, or for data mutations that don't need form state tracking.

```ts
const { processing, visit, get, post, put, patch, delete: del, reload } = useGum();
```

| Return | Purpose |
|---|---|
| `processing` | Ref — `true` while a request is in flight |
| `visit(url, options)` | Core method — send any HTTP method with full options |
| `get(url, options)` | GET request + navigates to the URL |
| `post(url, data, options)` | POST request with body data |
| `put(url, data, options)` | PUT request with body data |
| `patch(url, data, options)` | PATCH request with body data |
| `delete(url, options)` | DELETE request |
| `reload(options)` | Re-fetch the current page (preserves query) |

**`visit` options:**

| Option | Type | Default | Purpose |
|---|---|---|---|
| `method` | `"get" \| "post" \| "put" \| "patch" \| "delete"` | `"get"` | HTTP method |
| `data` | `object \| FormData` | — | Request body (for non-GET) |
| `query` | `object` | — | Query params appended to URL |
| `replace` | `boolean` | `false` | Use `router.replace()` instead of `router.push()` |
| `preserveState` | `boolean` | `true` for GET, else `false` | Keep remembered state across navigation |
| `preserveScroll` | `boolean` | `false` | Restore scroll position after navigation |
| `onBefore` | `() => boolean \| void` | — | Return `false` to cancel the visit |
| `onStart` | `() => void` | — | Called when request begins |
| `onProgress` | `(event) => void` | — | Upload progress events |
| `onSuccess` | `(response) => void` | — | Called on 2xx response |
| `onError` | `(error) => void` | — | Called on failure |
| `onFinish` | `() => void` | — | Called in both success and error |

```ts
const { get, post, processing } = useGum();

// GET — navigate to posts index
await get("/posts");

// GET with query params and state preservation
await get("/posts", { query: { page: 2, search: "vue" }, preserveState: true });

// POST — create a resource without navigating
await post("/api/posts", { title: "Hello", body: "World" }, {
  onSuccess: () => showToast("Created!"),
  onError: (err) => console.error(err),
});

// DELETE with confirmation
async function deletePost(id: number) {
  const confirmed = await dialog.confirm("Delete this post?");
  if (!confirmed) return;
  await del(`/api/posts/${id}`, { onSuccess: () => fetchPosts() });
}

// Reload current page
await reload({ preserveScroll: true });
```

#### `useGumForm()` — Form Handling

Use for forms that need validation error tracking, dirty detection, and upload progress.

```ts
const form = useGumForm({ title: "", body: "", category: "general" });
```

| Return | Purpose |
|---|---|
| `form.data` | Reactive form values — mutate directly with `form.data.title = "New"` |
| `form.errors` | Reactive validation errors keyed by field name (from server 422 or manual) |
| `form.progress` | Upload progress percentage (0–100), `null` when idle |
| `form.processing` | `true` while the form is submitting |
| `form.wasSuccessful` | `true` after a successful submission |
| `form.recentlySuccessful` | `true` for 2 seconds after success (useful for showing a brief checkmark) |
| `form.isDirty` | Computed — `true` if any field differs from initial values |
| `form.setError(field, message)` | Manually set a validation error for a field |
| `form.clearErrors(...fields)` | Clear all errors, or specific fields if provided |
| `form.reset(...fields)` | Reset form to initial values — all fields, or specific ones |
| `form.submit(method, url, payload?, options?)` | Core method — submit with any HTTP method |

**Shorthand submit methods:**

| Method | Purpose |
|---|---|
| `form.post(url, payload?, options?)` | POST submit |
| `form.put(url, payload?, options?)` | PUT submit |
| `form.patch(url, payload?, options?)` | PATCH submit |
| `form.delete(url, payload?, options?)` | DELETE submit |

```ts
const form = useGumForm({ email: "", password: "" });

async function handleLogin() {
  await form.post("/api/auth/login", undefined, {
    onSuccess: () => router.push("/dashboard"),
    onError: (err) => console.error("Login failed", err),
  });
}
```

```vue
<template>
  <form @submit.prevent="handleLogin">
    <Input v-model="form.data.email" label="Email" :error="form.errors.email" />
    <InputPasswordToggle v-model="form.data.password" label="Password" :error="form.errors.password" />
    <Button label="Sign In" type="submit" :loading="form.processing" block />
  </form>
</template>
```

**Upload with progress:**

```ts
const uploadForm = useGumForm({ file: null as File | null });

async function handleUpload() {
  const fd = new FormData();
  fd.append("file", uploadForm.data.file!);

  await uploadForm.post("/api/upload", fd, {
    onProgress: (event) => console.log(`${uploadForm.progress}%`),
    onSuccess: () => showToast("Uploaded!"),
  });
}
```

#### `useGumRemember()` — Persistent Page State

Persist page-local UI state (filters, search terms, tab selection) across navigations and reloads using localStorage.

```ts
// src/pages/posts/index.vue
const search = useGumRemember("posts:search", "");
const activeTab = useGumRemember("posts:tab", "published");
const page = useGumRemember("posts:page", 1);

// These values survive:
// - navigating away and pressing "Back"
// - page reload
// - programmatic visits with preserveState: true
```

| Return | Purpose |
|---|---|
| `useGumRemember(key, initial)` | Returns a ref-like value persisted to localStorage under `gum:<key>`. Merges defaults on first access. |

The state is automatically cleared on GET visits that do not set `preserveState: true`. This mirrors Inertia's `preserveState: false` behavior.

### Dialog

Dialog provides `alert`, `confirm`, and `prompt` via DOM-injected Bootstrap modals.

```ts
import { useDialog } from "@/plugins/dialog";

const dialog = useDialog();
```

| Method | Purpose |
|---|---|
| `dialog.alert(message)` | Show an alert modal. Resolves when dismissed. |
| `dialog.confirm(message)` | Show a confirm modal. Resolves `true` or `false`. |
| `dialog.prompt(message)` | Show a prompt modal. Resolves the entered string, or `null` on cancel. |

```ts
await dialog.alert("Saved successfully");

const confirmed = await dialog.confirm("Delete this post?");
if (!confirmed) return;

const name = await dialog.prompt("What is your name?");
```

## Validation

The frontend uses the backend's Zod schemas for validation. The `errors` object returned by the API is surfaced automatically in form components:

```vue
<Input v-model="form.email" label="Email" :error="form.errors?.email" />
```

## Layouts

Two layouts are provided:

### Dashboard Layout (`Layout/index.vue`)

Renders **Sidebar** (left navigation with accordion menus, active state highlighting, collapse persistence) + **Header** (sidebar toggle, page title, refresh, theme switch, user dropdown) + `<router-view />` (content area) + **Footer**.

### Auth Layout (`AuthLayout.vue`)

Minimal centered card layout for login, register, and password reset pages.

## Components

The framework includes a library of reusable form and UI components:

| Component | Description |
|---|---|
| `Button` | Styled button with label/icon/slot |
| `Input` | Text input with label, formatting categories, maxlength counter, error display |
| `InputPasswordToggle` | Password input with show/hide toggle |
| `InputGroup` | Two-part input (editable + readonly) |
| `Select` | Searchable select (wraps `vue-select`) |
| `SelectInfinite` | Infinite-scroll select with search & pagination |
| `TextArea` | Textarea with floating label & maxlength counter |
| `Checkbox` | Checkbox with v-model |
| `Switch` | Toggle switch |
| `Modal` | Bootstrap modal via teleport |
| `Toast` | Bootstrap toast via teleport |
| `Spinner` | Loading spinner |
| `DataTable` | Full data table with search, pagination, column sorting, skeleton loading |
| `Pagebar` | Teleports title into the header's page title area |
| `Refresh` | Binds a click handler to the header's refresh button |
| `Href` | Styled anchor link |
| `FloatButton` | Positioned fixed action button |

## Theme System

The frontend uses a custom SCSS theme engine with three modes:

- **Light** — default
- **Dark** — inverted color scheme
- **Auto** — follows `prefers-color-scheme`

Theme is managed by `admin-ui` store and toggled via `useAdminUiStore().toggleTheme()`. The theme class is applied to `<html>`: `.theme-light`, `.theme-dark`, or `.theme-auto`.

## Example: Complete Page with Real-Time

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { pulse } from "@/plugins/pulse";
import DataTable from "@/components/datatable/index.vue";
import Button from "@/components/Button.vue";

const auth = useAuthStore();
const items = ref<any[]>([]);
const loading = ref(true);

async function fetchItems() {
  const res = await fetch("/api/items");
  items.value = await res.json();
  loading.value = false;
}

let channel: any;

onMounted(async () => {
  await fetchItems();

  if (auth.user) {
    channel = pulse.channel(`user:${auth.user.id}`);
    channel.listen("item.created", (data: any) => {
      items.value.unshift(data);
    });
  }
});

onUnmounted(() => {
  if (channel) {
    channel.stopListening("item.created");
    pulse.leave(`user:${auth.user.id}`);
  }
});
</script>

<template>
  <Pagebar>Items</Pagebar>

  <div class="card">
    <div class="card-body">
      <DataTable
        :items="items"
        :loading="loading"
        :columns="[
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Title' },
          { key: 'createdAt', label: 'Created' },
        ]"
      />
    </div>
  </div>
</template>
```
