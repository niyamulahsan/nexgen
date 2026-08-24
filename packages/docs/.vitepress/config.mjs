import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/nexgen/",
  title: "nexgen",
  description: "Full-stack TypeScript framework with Hono, Vue 3, and Drizzle ORM",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/nexgen/favicon.svg" }],
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/nexgen/nexgen-logo.png" }],
    ["link", { rel: "icon", href: "/nexgen/favicon.ico", sizes: "any" }],
    ["link", { rel: "apple-touch-icon", sizes: "180x180", href: "/nexgen/nexgen-logo.png" }],
  ],
  themeConfig: {
    logo: "/nexgen-logo.png",
    nav: [
      { text: "Home", link: "/" },
      {
        text: "Docs",
        items: [
          { text: "Quick Start", link: "/guide/quick-start" },
          { text: "Guide", link: "/guide/introduction" },
          { text: "CLI", link: "/cli/reference" },
          { text: "Deploy", link: "/deploy/overview" },
        ],
      },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Quick Start", link: "/guide/quick-start" },
          ],
        },
        {
          text: "Essentials",
          items: [
            { text: "Architecture", link: "/guide/architecture" },
            { text: "Environment", link: "/guide/env" },
            { text: "Configuration", link: "/guide/configuration" },
            { text: "Routing", link: "/guide/routing" },
            { text: "OpenAPI", link: "/guide/openapi" },
            { text: "Modules", link: "/guide/modules" },
            { text: "Database", link: "/guide/database" },
            { text: "Authentication", link: "/guide/auth" },
            { text: "Unit Testing", link: "/guide/testing" },
          ],
        },
        {
          text: "Services",
          items: [
            { text: "Cache", link: "/guide/cache" },
            { text: "Queue & Events", link: "/guide/events-queue" },
            { text: "Scheduler", link: "/guide/scheduler" },
            { text: "Realtime", link: "/guide/realtime" },
            { text: "Notifications", link: "/guide/notification" },
            { text: "Storage", link: "/guide/storage" },
            { text: "Session", link: "/guide/session" },
            { text: "Rate Limiter", link: "/guide/rate-limiter" },
          ],
        },
        {
          text: "Support",
          items: [
            { text: "Cookie", link: "/guide/support/cookie" },
            { text: "JWT", link: "/guide/support/jwt" },
            { text: "Logger", link: "/guide/support/logger" },
            { text: "Mail", link: "/guide/support/mail" },
            { text: "Password", link: "/guide/support/password" },
            { text: "URL", link: "/guide/support/url" },
          ],
        },
        {
          text: "Frontend",
          items: [
            { text: "Overview", link: "/guide/resources/" },
            { text: "Entry Point", link: "/guide/resources/entry-point" },
            { text: "Vite Config", link: "/guide/resources/vite-config" },
            { text: "Router", link: "/guide/resources/router" },
            { text: "Pages", link: "/guide/resources/pages" },
            { text: "Layouts", link: "/guide/resources/layouts" },
            {
              text: "Plugins",
              items: [
                { text: "Gum", link: "/guide/resources/gum" },
                { text: "Pulse", link: "/guide/resources/pulse" },
                { text: "Dialog", link: "/guide/resources/dialog" },
                { text: "Axios", link: "/guide/resources/axios" },
              ],
            },
            { text: "Stores", link: "/guide/resources/stores" },
            { text: "Composables", link: "/guide/resources/composables" },
            { text: "Components", link: "/guide/resources/components" },
            { text: "Helpers", link: "/guide/resources/helpers" },
          ],
        },
        {
          text: "Others",
          items: [
            {
              text: "Date",
              items: [
                { text: "luxon", link: "/guide/others/date" }
              ]
            },
            {
              text: "lodash",
              items: [
                { text: "String", link: "/guide/others/string" },
                { text: "Array", link: "/guide/others/array" },
                { text: "Collection", link: "/guide/others/collection" },
                { text: "Function", link: "/guide/others/function" },
                { text: "Lang", link: "/guide/others/lang" },
                { text: "Math", link: "/guide/others/math" },
                { text: "Number", link: "/guide/others/number" },
                { text: "Object", link: "/guide/others/object" },
                { text: "Util", link: "/guide/others/util" },
              ]
            }
          ],
        },
      ],
      "/cli/": [
        { text: "CLI Reference", link: "/cli/reference" },
        { text: "Module Commands", link: "/cli/module" },
        { text: "Database Commands", link: "/cli/database" },
        { text: "Runtime Commands", link: "/cli/runtime" },
        { text: "Deploy Commands", link: "/cli/deploy" },
      ],
      "/deploy/": [
        { text: "Overview", link: "/deploy/overview" },
        { text: "Local Deploy", link: "/deploy/local" },
        { text: "Remote Deploy", link: "/deploy/remote" },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/niyamulahsan/nexgen" },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2024-present nexgen",
    },
    search: {
      provider: "local",
    },
    outline: {
      label: "On this page",
    },
    docFooter: {
      prev: "Previous",
      next: "Next",
    },
    lastUpdated: {
      text: "Last updated",
    },
    returnToTopLabel: "Return to top",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Appearance",
    lightModeSwitchTitle: "Switch to light mode",
    darkModeSwitchTitle: "Switch to dark mode",
  },
});
