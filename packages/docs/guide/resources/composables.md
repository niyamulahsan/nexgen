# Composables

Composables live in `src/resources/src/composables/`.

## `useAuth`

The `useAuth` composable provides reactive user state. The auth Pinia store (`stores/auth.ts`) calls `setUser()` / `clearUser()` internally — components read from `useAuth()`.

```ts
import { useAuth } from "@/composables/useAuth";
```

### Return values

| Property | Type | Description |
|----------|------|-------------|
| `user` | `Readonly<Ref<AuthUser \| null>>` | Current authenticated user (readonly) |
| `isAuthenticated` | `ComputedRef<boolean>` | `true` when a user is logged in |
| `setUser` | `(user: AuthUser \| null) => void` | Set the user (called by auth store) |
| `clearUser` | `() => void` | Clear the user (called by auth store) |

### Types

```ts
type AuthUser = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  role?: RoleLike | null;
  roles?: RoleLike[] | null;
};

type RoleLike = {
  id?: string | number;
  name?: string;
  title?: string;
  slug?: string;
};
```

### Usage

```vue
<script setup lang="ts">
import { useAuth } from "@/composables/useAuth";

const { user, isAuthenticated } = useAuth();
</script>

<template>
  <div v-if="isAuthenticated">
    Welcome, {{ user?.name }}
  </div>
  <div v-else>
    Please log in.
  </div>
</template>
```

## `hasRole`

Standalone function to check if the current user has a specific role.

```ts
import { hasRole } from "@/composables/useAuth";

// Check if user has "admin" role
if (hasRole("admin")) {
  // show admin panel
}

// Check if user has any role
if (hasRole()) {
  // user has at least one role
}

// Check if user has any of the listed roles
if (hasRole("admin", "editor")) {
  // user is admin OR editor
}
```

Role matching is case-insensitive and checks `name`, `title`, or `slug` on each role object.

## `authUser`

Standalone computed that returns the current user or an empty object:

```ts
import { authUser } from "@/composables/useAuth";

// authUser.value is AuthUser (never null — defaults to {})
```

### Removed composables

The following composables were previously re-exports and have been removed. Import directly from their plugin files instead:

| Removed | Replace with |
|---------|-------------|
| `@/composables/useGum` | `import { useGum, useGumForm } from "@/plugins/gum"` |
| `@/composables/usePulse` | `import { pulse } from "@/plugins/pulse"` |
| `@/composables/useDialog` | `import { dialog } from "@/plugins/dialog"` |
| `@/composables/useBrowserDetect` | `import { browserDetect } from "@/plugins/browserDetect"` |
