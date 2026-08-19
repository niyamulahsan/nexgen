# Helpers

Utility functions live in `src/resources/src/helpers/`.

## `nformatter.ts`

Compact number formatting (e.g. `1200` → `"1.2K"`):

```ts
import { formatCompactNumber } from "@/helpers/nformatter";

formatCompactNumber(999);     // 999
formatCompactNumber(1200);    // "1.2K"
formatCompactNumber(1500000); // "1.5M"
formatCompactNumber(NaN);     // "NaN"
```

Uses `Intl.NumberFormat` with `notation: "compact"`.

## `utils.ts`

General-purpose utilities:

### `inArray`

```ts
import { inArray } from "@/helpers/utils";

inArray("a", ["a", "b", "c"]);          // true
inArray("a", ["a", "b", "c"], true);    // true (strict)
inArray(NaN, [NaN]);                     // true (loose)
inArray(NaN, [NaN], true);              // false (strict uses includes)
```

### `empty`

Check if a value is empty (PHP-style):

```ts
import { empty } from "@/helpers/utils";

empty(null);       // true
empty(undefined);  // true
empty("");         // true
empty("0");        // true
empty(0);          // true
empty(NaN);        // true
empty([]);         // true
empty({});         // true
empty(new Map());  // true
empty(false);      // true
empty("hello");    // false
empty([1, 2]);     // false
```

### `downloadFile` / `downloadExcel`

Trigger a browser file download from a URL:

```ts
import { downloadFile, downloadExcel } from "@/helpers/utils";

// Direct URL
await downloadFile("/api/reports/monthly.pdf", "report.pdf");

// Same as downloadFile (alias)
await downloadExcel("/api/reports/monthly.xlsx", "report.xlsx");
```

If the URL is not absolute, it's passed through a `route()` helper.

### `formatTaxPeriod`

Format a `"yyyy-MM"` string as `"MMM yyyy"`:

```ts
import { formatTaxPeriod } from "@/helpers/utils";

formatTaxPeriod("2025-04"); // "Apr 2025"
formatTaxPeriod("");        // ""
```

### `formatDate`

Format an ISO date string as `"dd MMM yyyy"`:

```ts
import { formatDate } from "@/helpers/utils";

formatDate("2025-04-02T10:30:00Z"); // "02 Apr 2025"
formatDate(null);                    // ""
```
