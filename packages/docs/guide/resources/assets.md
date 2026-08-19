# Assets & Theme

Assets live in `src/resources/src/assets/`.

## Directory structure

```
assets/
├── css/
│   ├── styles.css
│   └── styles.css.map
├── scss/
│   ├── custom.scss
│   ├── custom.css
│   └── custom.css.map
├── fonts/
│   └── public-sans/
│       ├── public-sans-latin.woff2
│       └── public-sans-latin-ext.woff2
└── images/
    ├── favicon/
    │   ├── favicon.ico
    │   └── favicon1.ico
    ├── logo-1.png
    ├── logo-dark-sm.png
    ├── logo-dark.png
    ├── logo-dark1.png
    ├── logo-sm.png
    ├── logo1.png
    └── logo2.png
```

## Typography

The default UI font is **Public Sans**, self-hosted as WOFF2 in `assets/fonts/public-sans/` (latin + latin-ext subsets). It is applied to `body` and wired into Bootstrap via `--bs-body-font-family` and `--bs-font-sans-serif`. Override it in `custom.scss`:

```scss
body {
  font-family: "Your Font", sans-serif;
  --bs-body-font-family: "Your Font", sans-serif;
}
```

## Theme System

The frontend uses a custom SCSS theme engine with three modes:

- **Light** — default
- **Dark** — inverted color scheme
- **Auto** — follows `prefers-color-scheme`

Theme is managed by the `admin-ui` Pinia store and toggled via `useAdminUiStore().toggleTheme()`. The theme class is applied to `<html>`:

| Class | Mode |
|-------|------|
| `.theme-light` | Light mode |
| `.theme-dark` | Dark mode |
| `.theme-auto` | Follows OS preference |

### Customization

Edit `assets/scss/custom.scss` to override Bootstrap variables and add project-specific styles:

```scss
// Override Bootstrap primary color
$primary: #4f46e5;

// Custom component styles
.my-component {
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
}
```

### CSS variables

The theme exposes a set of `--app-*` custom properties plus the Bootstrap runtime variables. Useful ones for your own styles:

| Variable | Purpose |
|---|---|
| `--app-bg` | Page background |
| `--app-text` | Default text color |
| `--app-primary` | Brand primary color |
| `--app-backdrop` | Overlay/dialog backdrop color |
| `--app-hover` | Hover background |
| `--app-skeleton` | Skeleton loader base color |
| `--app-skeleton-hi` | Skeleton loader highlight color |
| `--bs-secondary-bg-subtle` | Subtle secondary background (e.g. table hover) |
| `.fs-7` | Small helper class (12px font-size) |

Both `--app-skeleton` and `--app-skeleton-hi` are used by the `DataTableSkeleton` loading state and adapt to light/dark mode.
