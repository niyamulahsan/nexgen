# Mail

## Overview

The mail utility provides **transactional email sending** through a configured SMTP transport using nodemailer. It supports HTML and plain text emails, and gracefully handles failures based on the `MAIL_FAIL_SILENT` setting.

## Mail Utility

```ts
import { mail } from "@/framework/facade.js";
```

| Method | Purpose |
|---|---|
| `mail.sendMail(payload)` | Sends an email with `to`, `subject`, and optional `html`/`text`. Returns the send result or `null` on failure (when `MAIL_FAIL_SILENT=true`). |

## Usage

```ts
import { mail } from "@/framework/facade.js";

await mail.sendMail({
  to: "user@example.com",
  subject: "Welcome",
  html: "<h1>Welcome!</h1><p>Thanks for signing up.</p>"
});
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MAIL_HOST` | `127.0.0.1` | SMTP host |
| `MAIL_PORT` | `1089` | SMTP port |
| `MAIL_USERNAME` | `""` | SMTP username (empty = no auth) |
| `MAIL_PASSWORD` | `""` | SMTP password |
| `MAIL_FROM_ADDRESS` | `noreply@nexgen.local` | Default from address |
| `MAIL_FAIL_SILENT` | `true` | Swallow send errors when true, rethrow when false |
