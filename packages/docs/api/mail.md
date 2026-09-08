# `mail` — SMTP transport

Imported from the facade: `import { mail } from "@/framework/facade.js"`.

Guide: [Mail](./../guide/support/mail).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `mail.sendMail` | `({ to, subject, html?, text? }) => Promise<*>` | Returns send result, or `null` when `failSilent` swallows errors |

## Use cases

```ts
import { mail } from "@/framework/facade.js";

await mail.sendMail({
  to: "user@example.com",
  subject: "Welcome",
  html: "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
});
```

### Real world — account creation mail

```ts
await mail.sendMail({
  to: email,
  subject: "Account Creation",
  html: `<p>Hello ${name},</p><p>Your account was created.</p>`,
});
```

### Real world — forgot password

```ts
await mail.sendMail({
  to: job.data.email,
  subject: "Forget password",
  html: `Your password is ${job.data.forgetPassword}`,
});
```

## Notes

- Config lives in `config/mail.ts` (host/port/encryption/`failSilent`); credentials in `.env`.
- Backend-only — used in controllers, jobs, middleware, and seeders.
- With `failSilent`, send errors return `null` instead of throwing.

## Related

- [shouldQueue](./shouldQueue) · [logger](./logger)