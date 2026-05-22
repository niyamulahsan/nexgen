# Array

## Overview

The framework re-exports **lodash-es** via the facade for array manipulation. All lodash array methods are available through a single import.

## Import

```ts
import { lodash } from "@/framework/facade.js";
```

## Common Methods

| Method | Purpose |
|---|---|
| `lodash.chunk(array, size)` | Splits array into groups of the given size |
| `lodash.compact(array)` | Removes falsy values (`false`, `null`, `0`, `""`, `undefined`, `NaN`) |
| `lodash.uniq(array)` | Creates a duplicate-free version of the array |
| `lodash.uniqBy(array, iteratee)` | Removes duplicates based on a criteria |
| `lodash.difference(array, values)` | Returns elements in `array` not present in `values` |
| `lodash.intersection(arrays)` | Returns elements present in all arrays |
| `lodash.pull(array, ...values)` | Removes all given values from the array (mutates) |
| `lodash.remove(array, predicate)` | Removes elements that match the predicate (mutates) |
| `lodash.orderBy(array, keys, orders)` | Stable sort by multiple columns |
| `lodash.groupBy(array, iteratee)` | Groups elements by a key |
| `lodash.keyBy(array, iteratee)` | Creates an object keyed by the iteratee result |
| `lodash.maxBy(array, iteratee)` | Returns the element with the maximum value |
| `lodash.minBy(array, iteratee)` | Returns the element with the minimum value |
| `lodash.flatMap(array, iteratee)` | Maps and flattens one level |

## Usage

```ts
import { lodash } from "@/framework/facade.js";

const users = [
  { name: "Alice", role: "admin" },
  { name: "Bob", role: "user" },
  { name: "Charlie", role: "admin" },
];

lodash.groupBy(users, "role");
// { admin: [{ name: "Alice" }, { name: "Charlie" }], user: [{ name: "Bob" }] }

lodash.orderBy(users, ["name"], ["asc"]);
// [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }]

lodash.uniqBy(users, "role");
// [{ name: "Alice", role: "admin" }, { name: "Bob", role: "user" }]
```

## Reference

Refer to the [lodash array documentation](https://lodash.com/docs/#chunk) for the complete list of available methods.
