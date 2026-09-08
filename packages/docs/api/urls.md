# `urls` — absolute URL building

Imported from the facade: `import { urls } from "@/framework/facade.js"`.

Guide: [URL](./../guide/support/url).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `urls.appUrl` | `() => string` | `APP_URL` without trailing slash |
| `urls.url` | `(path?) => string` | Join `APP_URL` with a path (slash-normalized) |

## Use cases

```ts
import { urls } from "@/framework/facade.js";

urls.url("/reset-password?token=abc");
// "https://example.com/reset-password?token=abc"
```

## Notes

- Reads `APP_URL` from `.env`; strips trailing slashes before joining.
- Use for absolute links in emails, PDFs, and notification payloads.

## Related

- [cookie](./cookie)