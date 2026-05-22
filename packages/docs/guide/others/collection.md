# Collection

## Overview

The framework re-exports **lodash-es** via the facade for collection manipulation. These methods work on arrays and objects alike.

## Import

```ts
import { lodash } from "@/framework/facade.js";
```

## Common Methods

| Method | Purpose |
|---|---|
| `lodash.forEach(collection, iteratee)` | Iterates over elements |
| `lodash.map(collection, iteratee)` | Creates an array of values by running each element through iteratee |
| `lodash.filter(collection, predicate)` | Iterates over elements, returning those that pass |
| `lodash.reduce(collection, iteratee, accumulator)` | Reduces collection to a single value |
| `lodash.find(collection, predicate, fromIndex)` | Returns the first matching element |
| `lodash.findLast(collection, predicate, fromIndex)` | Returns the last matching element |
| `lodash.includes(collection, value, fromIndex)` | Checks if value is in the collection |
| `lodash.every(collection, predicate)` | Checks if all elements pass the predicate |
| `lodash.some(collection, predicate)` | Checks if any element passes the predicate |
| `lodash.countBy(collection, iteratee)` | Counts occurrences by key |
| `lodash.groupBy(collection, iteratee)` | Groups elements by key |
| `lodash.keyBy(collection, iteratee)` | Indexes by key (first match wins) |
| `lodash.sortBy(collection, iteratees)` | Stable sort by iteratee(s) |
| `lodash.orderBy(collection, iteratees, orders)` | Sort with direction (`"asc"` / `"desc"`) |
| `lodash.partition(collection, predicate)` | Splits into two arrays: pass / fail |
| `lodash.reject(collection, predicate)` | Opposite of `filter` |
| `lodash.sample(collection)` | Gets a random element |
| `lodash.sampleSize(collection, n)` | Gets n random elements |
| `lodash.shuffle(collection)` | Returns a shuffled copy |
| `lodash.size(collection)` | Returns the collection length |

## Usage

```ts
import { lodash } from "@/framework/facade.js";

const users = [
  { name: "Alice", age: 25, role: "admin" },
  { name: "Bob", age: 30, role: "user" },
  { name: "Charlie", age: 35, role: "admin" },
];

lodash.groupBy(users, "role");
// { admin: [Alice, Charlie], user: [Bob] }

lodash.partition(users, u => u.age < 30);
// [ [Alice], [Bob, Charlie] ]

lodash.countBy(users, "role");
// { admin: 2, user: 1 }

lodash.sample(users);
// { name: "Bob", age: 30, role: "user" }  (random)
```

## Reference

Refer to the [lodash collection documentation](https://lodash.com/docs/#countBy) for the complete list of available methods.
