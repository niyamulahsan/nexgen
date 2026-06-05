# Stores

The frontend uses Pinia for state management. Stores live in `src/resources/src/stores/`.

## Auth Store

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

| Action | Description |
|--------|-------------|
| `bootstrap()` | Called on every route navigation — restores or verifies the session via cookie |
| `login(credentials)` | Authenticates with email/password, sets `user` state |
| `register(data)` | Creates a new account |
| `logout()` | Clears session and redirects to `/login` |
| `forgotPassword(email)` | Sends password reset link |
| `resetPassword(data)` | Resets password with token |
| `verifyEmail(data)` | Verifies email address |

## UI Store

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

| Action | Description |
|--------|-------------|
| `toggleSidebar()` | Collapses or expands the dashboard sidebar |
| `toggleTheme()` | Cycles through light → dark → auto |

The `themeMode` state determines which theme class is applied to `<html>`: `.theme-light`, `.theme-dark`, or `.theme-auto`.
