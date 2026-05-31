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

Gum provides the frontend's Inertia-style visit layer for axios requests, Vue Router query updates, scroll preservation, form state, and remembered local UI state.

Use it for:

- paginated listing pages with reload-safe query params
- search/filter/sort visits
- `preserveScroll` table interactions
- create/update/delete request lifecycle hooks
- form processing, validation errors, and upload progress
- local UI state through `useGumRemember()`

See the dedicated [Gum guide](/guide/resources/gum) for complete examples.

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
| `Select` | Searchable select with infinite-scroll, pagination, and API fetching (wraps `vue-select`) |
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

### DataTable

A fully-featured data table component with server-side pagination, search, bulk delete, and configurable page size. Works with any paginated API response via the `PaginatedData` interface.

**Import:**
```vue
import DataTable from "@/components/datatable/index.vue";
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `PaginatedData` | required | Server response with `{ data, current_page, last_page, per_page, total, path }` |
| `search` | `string` | `""` | Initial search query |
| `loop` | `DataRow[] \| false` | — | Override rows (useful for local data). Falls back to `data.data` |
| `option` | `(string \| number)[]` | `[]` | Per-page size options for the "Show X entries" dropdown |
| `removable` | `boolean` | `true` | Show checkboxes and trash button for bulk delete |
| `countable` | `boolean` | `true` | Show row number column |
| `searchable` | `boolean` | `true` | Show search input in header |
| `optionable` | `boolean` | `true` | Show "Show X entries" dropdown |
| `disabled` | `boolean` | `false` | Disable all interactive elements |

**Slots:**

| Slot | Bindings | Description |
|------|----------|-------------|
| `extra-tools` | — | Additional buttons/controls in the card header (right side) |
| `extra` | — | Content inserted before the table (inside card body) |
| `customhead` | — | Replace the entire `<thead>` (hides default thead) |
| `thead` | — | Extra `<th>` columns appended after checkbox + `#` columns |
| `custombody` | — | Replace the entire `<tbody>` (hides default tbody) |
| `tbody` | `{ td: DataRow }` | Per-row `<td>` columns. Use `<slot name="tbody" :td="dt">` in parent |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `remove` | `(string \| number)[]` | Emitted when the trash button is clicked, with selected row IDs |

**`PaginatedData` interface:**
```ts
interface PaginatedData {
  data: DataRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  path: string;          // base URL for API requests
}
```

**Usage with server-side pagination:**

```vue
<script setup lang="ts">
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import DataTable from "@/components/datatable/index.vue";
import { usePostsStore } from "@/stores/posts";

const route = useRoute();
const store = usePostsStore();
const { posts } = storeToRefs(store);

const search = computed(() => String(route.query.search || ""));

watch(
  () => route.query,
  async () => {
    await store.fetchPosts({
      page: Number(route.query.page || 1),
      size: Number(route.query.size || 10),
      search: String(route.query.search || "")
    });
  },
  { immediate: true }
);
</script>

<template>
  <div class="card">
    <div class="card-body">
      <DataTable
        :data="posts"
        :search="search"
        :option="[10, 25, 50, 100]"
        :removable="true"
        :countable="true"
        @remove="(ids) => console.log('Delete', ids)">
        <template #thead>
          <th>Title</th>
          <th>Author</th>
          <th>Created</th>
        </template>
        <template #tbody="{ td }">
          <td>{{ td.title }}</td>
          <td>{{ td.author }}</td>
          <td>{{ td.created_at }}</td>
        </template>
      </DataTable>
    </div>
  </div>
</template>
```

---

### Select

A searchable select component with infinite-scroll pagination and API data fetching. Built on `vue-select` — handles everything from simple static option lists to server-side paginated searches.

**Import:**
```vue
import Select from "@/components/Select.vue";
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fetched` | `(payload) => FetchPack \| null` | — | Callback that returns the fetch config for a given search term |
| `must` | `boolean` | — | Show a required-field indicator (red dot next to label) |
| `err` | `string \| boolean` | — | Validation error text to display below the select |
| `hood` | `string \| boolean` | — | Optional hint/helper text displayed inline next to the label |
| `defaultValue` | `SelectValue` | `null` | Pre-select a value on mount |
| `resetKey` | `any` | `null` | When this value changes, the select clears and reloads |

**Inherited via `v-bind="$attrs"`:**

| Attr | Type | Description |
|------|------|-------------|
| `id` | `string` | Sets `for` on the label |
| `title` | `string` | Label text |
| `parentclass` | `string` | CSS class on the wrapper div (default `"mb-2"`) |
| `multiple` | `boolean` | Enable multi-select |
| `options` | `array` | Static options array (for non-API mode) |
| `label` | `string` | Key to use as display label in options |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `fetched` | — | Emitted after options are fetched |
| `clear` | — | Emitted when the selection is cleared |

**Exposed methods (via template ref):**

| Method | Description |
|--------|-------------|
| `reload()` | Reset selection and re-fetch first page |

**`FetchPack` interface:**
```ts
interface FetchPack {
  url: string;                          // API endpoint
  data: string;                         // Response key containing paginated data
  params?: Record<string, unknown>;     // Additional query params
  mapFn?: (item) => Record<string, unknown>;  // Transform each row
  option?: (value) => void;             // Callback when an option is selected/cleared
}
```

**Basic usage — API-fetched with pagination:**

```vue
<script setup lang="ts">
import Select from "@/components/Select.vue";

const user = ref(null);

function fetchUsers({ search, reset, reload }) {
  return {
    url: "/api/users",
    data: "users",
    params: { search },
    mapFn: (row) => ({ id: row.id, title: row.name }),
  };
}
</script>

<template>
  <Select
    v-model="user"
    id="user-select"
    title="Select User"
    :fetched="fetchUsers"
    :err="form.errors?.user_id" />
</template>
```

**Usage with multiple and reset:**

```vue
<script setup lang="ts">
import Select from "@/components/Select.vue";

const categories = ref([]);
const categoryResetKey = ref(null);

function fetchCategories({ search, reset, reload }) {
  return {
    url: "/api/categories",
    data: "categories",
    params: { search },
    mapFn: (row) => ({ id: row.id, title: row.name }),
  };
}

function clearCategories() {
  categoryResetKey.value = Date.now();
}
</script>

<template>
  <Select
    v-model="categories"
    id="category-select"
    title="Categories"
    :fetched="fetchCategories"
    :reset-key="categoryResetKey"
    multiple />
</template>
```

**Usage with static options (no API):**

```vue
<script setup lang="ts">
import Select from "@/components/Select.vue";

const role = ref(null);
const roles = [
  { id: 1, title: "Admin" },
  { id: 2, title: "Editor" },
  { id: 3, title: "Viewer" },
];
</script>

<template>
  <Select
    v-model="role"
    title="Role"
    :options="roles"
    label="title" />
</template>
```

---

## Theme System

The frontend uses a custom SCSS theme engine with three modes:

- **Light** — default
- **Dark** — inverted color scheme
- **Auto** — follows `prefers-color-scheme`

Theme is managed by `admin-ui` store and toggled via `useAdminUiStore().toggleTheme()`. The theme class is applied to `<html>`: `.theme-light`, `.theme-dark`, or `.theme-auto`.

## Example: Complete Page with Real-Time

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { usePostsStore } from "@/stores/posts";
import { pulse } from "@/plugins/pulse";
import { useGum } from "@/composables/useGum";

import Pagebar from "@/components/Pagebar.vue";
import DataTable from "@/components/datatable/index.vue";

const route = useRoute();
const auth = useAuthStore();
const store = usePostsStore();
const { posts } = storeToRefs(store);
const gum = useGum();

const search = computed(() => String(route.query.search || ""));

function queryParams() {
  return {
    page: Number(route.query.page || 1),
    size: Number(route.query.size || 10),
    search: String(route.query.search || "")
  };
}

let channel: any;

watch(
  () => route.query,
  async () => {
    await store.fetchPosts(queryParams());
  },
  { immediate: true }
);

onMounted(() => {
  if (auth.user) {
    channel = pulse.channel(`user:${auth.user.id}`);
    channel.listen("post.created", async () => {
      await store.fetchPosts(queryParams());
    });
  }
});

async function remove(ids: number[]) {
  await gum.delete(`/api/posts/${ids[0]}`, {
    preserveScroll: true,
    preserveState: true,
    onSuccess: async () => {
      await store.fetchPosts(queryParams());
    }
  });
}

onUnmounted(() => {
  if (channel) {
    channel.stopListening("post.created");
    pulse.leave(`user:${auth.user.id}`);
  }
});
</script>

<template>
  <Pagebar>Posts</Pagebar>

  <div class="card">
    <div class="card-body">
      <DataTable
        :data="posts"
        :search="search"
        :option="[10, 25, 50]"
        @remove="remove">
        <template #thead>
          <th>Title</th>
          <th>Status</th>
          <th>Created</th>
        </template>
        <template #tbody="{ td }">
          <td>{{ td.title }}</td>
          <td>{{ td.status }}</td>
          <td>{{ td.created_at }}</td>
        </template>
      </DataTable>
    </div>
  </div>
</template>
```
