# Composables

Composables live in `src/resources/src/composables/`. The only remaining composable with real logic is `useAuth`.

## `useAuth`

The `useAuth` composable provides HTTP logic for authentication. It is consumed by the auth Pinia store (`stores/auth.ts`) and should not be used directly in components — use `useAuthStore()` instead.

```ts
import { useAuth } from "@/composables/useAuth";
```

```ts
export function useAuth() {
  function login(
    credentials: { email: string; password: string },
    callbacks?: { onSuccess?: () => void; onError?: (errors: any) => void }
  ): Promise<void> { /* ... */ }

  function register(
    data: { name: string; email: string; password: string; password_confirmation: string },
    callbacks?: { onSuccess?: () => void; onError?: (errors: any) => void }
  ): Promise<void> { /* ... */ }

  function logout(): Promise<void> { /* ... */ }

  function forgotPassword(
    email: string,
    callbacks?: { onSuccess?: () => void; onError?: (errors: any) => void }
  ): Promise<void> { /* ... */ }

  function resetPassword(
    data: { token: string; email: string; password: string; password_confirmation: string },
    callbacks?: { onSuccess?: () => void; onError?: (errors: any) => void }
  ): Promise<void> { /* ... */ }

  function verifyEmail(
    data: { id: string; hash: string },
    callbacks?: { onSuccess?: () => void; onError?: (errors: any) => void }
  ): Promise<void> { /* ... */ }

  return { login, register, logout, forgotPassword, resetPassword, verifyEmail };
}
```

Each method calls the corresponding API endpoint and supports `onSuccess`/`onError` callbacks. The auth store wraps these methods with its own state management (user, loading).

### Removed composables

The following composables were previously re-exports and have been removed. Import directly from their plugin files instead:

| Removed | Replace with |
|---------|-------------|
| `@/composables/useGum` | `import { useGum, useGumForm } from "@/plugins/gum"` |
| `@/composables/usePulse` | `import { pulse } from "@/plugins/pulse"` |
| `@/composables/useDialog` | `import { dialog } from "@/plugins/dialog"` |
| `@/composables/useBrowserDetect` | `import { browserDetect } from "@/plugins/browserDetect"` |
