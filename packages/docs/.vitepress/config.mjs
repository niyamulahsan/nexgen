import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/nexgen/",
  title: "Nexgen",
  description: "Full-stack TypeScript framework with Hono, Vue 3, and Drizzle ORM",
  themeConfig: {
    nav: [
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
        { text: "Cookie", link: "/guide/cookie" },
        { text: "JWT", link: "/guide/jwt" },
        { text: "Logger", link: "/guide/logger" },
        { text: "Mail", link: "/guide/mail" },
        { text: "Password", link: "/guide/password" },
        { text: "URL", link: "/guide/url" },
        { text: "Resources", link: "/guide/resources" },
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
