# Mail

## Overview

The mail utility provides **transactional email sending** through a configured SMTP transport using nodemailer. It supports HTML and plain text emails, and gracefully handles failures based on the `failSilent` setting.

## Mail Utility

```ts
import { mail } from "@/framework/facade.js";
```

| Method | Purpose |
|---|---|
| `mail.sendMail(payload)` | Sends an email with `to`, `subject`, and optional `html`/`text`. Returns the send result or `null` on failure (when `failSilent: true`). |

## Usage

```ts
import { mail } from "@/framework/facade.js";

await mail.sendMail({
  to: "user@example.com",
  subject: "Welcome",
  html: "<h1>Welcome!</h1><p>Thanks for signing up.</p>"
});
```

## Configuration

Mail settings are in `src/config/mail.ts`. Username/password stay in `.env`; the rest are plain literals you can edit directly.

| Setting | Default | Description |
|---|---|---|
| `host` | `127.0.0.1` | SMTP host |
| `port` | `1089` | SMTP port |
| `encryption` | `"none"` | Connection security: `"ssl"` (implicit TLS, port 465), `"tls"` (STARTTLS, port 587), or `"none"` (plain — MailDev on 1089) |
| `fromAddress` | `"no-reply@example.com"` | Default from address |
| `failSilent` | `true` | Swallow send errors when true, rethrow when false |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MAIL_USERNAME` | `""` | SMTP username (empty = no auth) |
| `MAIL_PASSWORD` | `""` | SMTP password |
