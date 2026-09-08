# `lodash` — the Lodash library

Imported from the facade: `import { lodash } from "@/framework/facade.js"`.

The full Lodash bundle is re-exported for convenience. Guides live under [Others > lodash](./../guide/others/string).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `lodash` | `Lodash` | Complete Lodash API (groupBy, orderBy, omit, pick, …) |

## Use cases

```ts
import { lodash } from "@/framework/facade.js";

lodash.groupBy(rows, "category");
lodash.orderBy(list, ["createdAt"], ["desc"]);
lodash.pick(row, ["id", "name"]);
```

## Notes

- Import `lodash` from the facade rather than the bare package so the re-export is consistent across modules.
- See the [lodash guides](./../guide/others/string) for the full breakdown.

## Related

- [HttpStatusCodes](./HttpStatusCodes)