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
