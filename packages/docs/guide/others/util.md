# Util

## Overview

The framework re-exports **lodash-es** via the facade for general utility functions. These cover identity, iteration, templating, and flow control.

## Import

```ts
import { lodash } from "@/framework/facade.js";
```

## Common Methods

| Method | Purpose |
|---|---|
| `lodash.identity(value)` | Returns the argument unchanged |
| `lodash.noop()` | Returns `undefined` (no operation) |
| `lodash.constant(value)` | Creates a function that returns `value` |
| `lodash.defaultTo(value, defaultValue)` | Returns `defaultValue` if `value` is `nil` |
| `lodash.times(n, iteratee)` | Invokes `iteratee` `n` times, returns array of results |
| `lodash.uniqueId(prefix)` | Generates a unique ID with optional prefix |
| `lodash.range(start, end, step)` | Creates an array of numbers |
| `lodash.rangeRight(start, end, step)` | Same as `range` but descending |
| `lodash.attempt(func, ...args)` | Tries to call `func`, returns error instead of throwing |
| `lodash.iteratee(value)` | Creates a function that produces the given value's property |
| `lodash.matches(source)` | Creates a function that checks deep equality with `source` |
| `lodash.matchesProperty(path, value)` | Creates a function that checks property equality |
| `lodash.property(path)` | Creates a function that returns the value at `path` |
| `lodash.propertyOf(object)` | Inverse of `property` |
| `lodash.flow(...funcs)` | Creates a left-to-right function composition |
| `lodash.flowRight(...funcs)` | Creates a right-to-left function composition |
| `lodash.over(...iteratees)` | Creates a function that invokes all iteratees and returns results |
| `lodash.overEvery(...predicates)` | Checks if all predicates return truthy |
| `lodash.overSome(...predicates)` | Checks if any predicate returns truthy |
| `lodash.stubArray()` | Returns an empty array |
| `lodash.stubFalse()` | Returns `false` |
| `lodash.stubObject()` | Returns an empty object |
| `lodash.stubString()` | Returns an empty string |
| `lodash.stubTrue()` | Returns `true` |
| `lodash.template(string, options)` | Compiles a template string |

## Usage

```ts
import { lodash } from "@/framework/facade.js";

// Unique IDs
lodash.uniqueId("user_");
// "user_1"
lodash.uniqueId("user_");
// "user_2"

// Range
lodash.range(5);
// [0, 1, 2, 3, 4]

lodash.range(1, 10, 2);
// [1, 3, 5, 7, 9]

// Times
lodash.times(3, i => `item_${i}`);
// ["item_0", "item_1", "item_2"]

// Function composition
const add = (a: number) => a + 1;
const double = (a: number) => a * 2;
const addThenDouble = lodash.flow(add, double);
addThenDouble(5);
// 12

// Safe attempt
lodash.attempt(JSON.parse, "{invalid}");
// SyntaxError (not thrown)

// Default values
lodash.defaultTo(null, "fallback");
// "fallback"

lodash.defaultTo(0, "fallback");
// 0

// Template
const compiled = lodash.template("Hello, <%= name %>!");
compiled({ name: "Alice" });
// "Hello, Alice!"
```

## Reference

Refer to the [lodash util documentation](https://lodash.com/docs/#attempt) for the complete list of available methods.
