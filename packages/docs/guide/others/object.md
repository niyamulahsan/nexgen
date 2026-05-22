# Object

## Overview

The framework re-exports **lodash-es** via the facade for object manipulation. These methods handle picking, omitting, merging, and deep property access.

## Import

```ts
import { lodash } from "@/framework/facade.js";
```

## Common Methods

| Method | Purpose |
|---|---|
| `lodash.pick(object, paths)` | Creates an object with the picked keys |
| `lodash.pickBy(object, predicate)` | Picks keys based on predicate |
| `lodash.omit(object, paths)` | Creates an object omitting the specified keys |
| `lodash.omitBy(object, predicate)` | Omits keys based on predicate |
| `lodash.get(object, path, defaultValue)` | Gets nested value by dot/bracket path |
| `lodash.set(object, path, value)` | Sets nested value (mutates) |
| `lodash.has(object, path)` | Checks if path exists in the object |
| `lodash.merge(object, sources)` | Deep merges source objects (mutates) |
| `lodash.mergeWith(object, sources, customizer)` | Deep merge with customizer |
| `lodash.assign(object, sources)` | Copies own enumerable properties (mutates) |
| `lodash.assignIn(object, sources)` | Copies own and inherited properties |
| `lodash.defaults(object, sources)` | Assigns values from sources if `undefined` |
| `lodash.defaultsDeep(object, sources)` | Deep version of `defaults` |
| `lodash.keys(object)` | Returns enumerable property names |
| `lodash.values(object)` | Returns property values |
| `lodash.entries(object)` | Returns `[key, value]` pairs (alias: `toPairs`) |
| `lodash.mapKeys(object, iteratee)` | Transforms keys |
| `lodash.mapValues(object, iteratee)` | Transforms values |
| `lodash.invert(object)` | Swaps keys and values |
| `lodash.findKey(object, predicate)` | Finds key of first matching value |
| `lodash.forOwn(object, iteratee)` | Iterates over own properties |
| `lodash.result(object, path, defaultValue)` | Resolves the value at path (calls if function) |

## Usage

```ts
import { lodash } from "@/framework/facade.js";

const user = {
  name: "Alice",
  email: "alice@example.com",
  password: "secret",
  age: 25,
};

// Pick safe fields
lodash.pick(user, ["name", "email"]);
// { name: "Alice", email: "alice@example.com" }

// Omit sensitive fields
lodash.omit(user, ["password"]);
// { name: "Alice", email: "alice@example.com", age: 25 }

// Deep property access
const data = { a: { b: { c: 42 } } };
lodash.get(data, "a.b.c");
// 42

lodash.get(data, "x.y.z", "default");
// "default"

// Deep merge
const defaults = { theme: "light", cache: { ttl: 300 } };
const config = { cache: { ttl: 600 } };
lodash.merge(defaults, config);
// { theme: "light", cache: { ttl: 600 } }
```

## Reference

Refer to the [lodash object documentation](https://lodash.com/docs/#assign) for the complete list of available methods.
