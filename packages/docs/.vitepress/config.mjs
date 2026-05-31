import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/nexgen/",
  title: "nexgen",
  description: "Full-stack TypeScript framework with Hono, Vue 3, and Drizzle ORM",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "CLI", link: "/cli/reference" },
      { text: "Deploy", link: "/deploy/overview" },
    ],
    sidebar: {
      "/guide/": [
        { text: "Getting Started", link: "/guide/getting-started" },
        { text: "Environment", link: "/guide/env" },
        { text: "Architecture", link: "/guide/architecture" },
        { text: "Modules", link: "/guide/modules" },
        { text: "Database", link: "/guide/database" },
        { text: "Events & Queue", link: "/guide/events-queue" },
        { text: "Scheduler", link: "/guide/scheduler" },
        { text: "Realtime", link: "/guide/realtime" },
        { text: "Notifications", link: "/guide/notification" },
        { text: "Storage", link: "/guide/storage" },
        { text: "Cache", link: "/guide/cache" },
        { text: "Session", link: "/guide/session" },
        { text: "Authentication", link: "/guide/auth" },
        {
          text: "Resources",
          collapsed: false,
          items: [
            { text: "Overview", link: "/guide/resources/" },
            { text: "Gum", link: "/guide/resources/gum" },
          ],
        },
        {
          text: "Support",
          collapsed: true,
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
          text: "Others",
          collapsed: true,
          items: [
            { text: "Date (luxon)", link: "/guide/others/date" },
            { text: "String (lodash)", link: "/guide/others/string" },
            { text: "Array (lodash)", link: "/guide/others/array" },
            { text: "Collection (lodash)", link: "/guide/others/collection" },
            { text: "Function (lodash)", link: "/guide/others/function" },
            { text: "Lang (lodash)", link: "/guide/others/lang" },
            { text: "Math (lodash)", link: "/guide/others/math" },
            { text: "Number (lodash)", link: "/guide/others/number" },
            { text: "Object (lodash)", link: "/guide/others/object" },
            { text: "Util (lodash)", link: "/guide/others/util" },
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
      message: "Built with nexgen",
    },
  },
});
