# Layouts

Two layouts are provided, each registered as a parent route in the router.

## Dashboard Layout (`Layout/index.vue`)

Renders the full application shell for authenticated pages:

```
┌──────────────────────────────────┐
│           Header                 │
│  ☰  Page Title  🔄  🌙  👤     │
├──────────┬───────────────────────┤
│          │                       │
│ Sidebar  │   <router-view />    │
│          │                       │
│  📊      │    (page content)     │
│  Posts   │                       │
│  Users   │                       │
│          │                       │
├──────────┴───────────────────────┤
│            Footer                │
└──────────────────────────────────┘
```

### Components

| Component | File                 | Description                                                                                                          |
| --------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Sidebar` | `Layout/Sidebar.vue` | Left navigation with accordion menus, active state highlighting, collapse persistence                                |
| `Header`  | `Layout/Header.vue`  | Sidebar toggle, page title (receives teleported content from `Pagebar`), refresh button, theme switch, user dropdown |
| `Footer`  | `Layout/Footer.vue`  | Simple footer with copyright                                                                                         |

## Auth Layout (`AuthLayout.vue`)

Minimal centered card layout for guest-only pages:

```
┌──────────────────────────────────┐
│                                  │
│      ┌──────────────────┐        │
│      │                  │        │
│      │   Logo           │        │
│      │                  │        │
│      │   <router-view>  │        │
│      │   (login form,   │        │
│      │    register,     │        │
│      │    password       │        │
│      │    reset, etc.)  │        │
│      │                  │        │
│      └──────────────────┘        │
│                                  │
└──────────────────────────────────┘
```

Used by: `login`, `register`, `forgetPassword`, `resetPassword`, `verifyEmail` routes.
