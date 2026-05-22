# Function

## Overview

The framework re-exports **lodash-es** via the facade for function utilities. These helpers control execution timing, argument handling, and behavior modification.

## Import

```ts
import { lodash } from "@/framework/facade.js";
```

## Common Methods

| Method | Purpose |
|---|---|
| `lodash.debounce(func, wait, options)` | Delays invocation until `wait` ms after the last call |
| `lodash.throttle(func, wait, options)` | Ensures at most one call per `wait` ms |
| `lodash.memoize(func, resolver)` | Caches the result of a function call |
| `lodash.once(func)` | Ensures `func` is called only once |
| `lodash.after(n, func)` | Calls `func` after it has been called `n` times |
| `lodash.before(n, func)` | Calls `func` no more than `n` times |
| `lodash.ary(func, n)` | Limits arguments to `n` |
| `lodash.curry(func, arity)` | Curries the function |
| `lodash.curryRight(func, arity)` | Right-curries the function |
| `lodash.negate(predicate)` | Creates a negated predicate function |
| `lodash.wrap(value, wrapper)` | Wraps `value` with `wrapper` |
| `lodash.delay(func, wait, ...args)` | Calls `func` after `wait` ms |
| `lodash.defer(func, ...args)` | Calls `func` at the end of the current event loop |
| `lodash.overArgs(func, transforms)` | Transforms arguments before calling `func` |
| `lodash.flip(func)` | Creates a function with inverted arguments |
| `lodash.partial(func, ...partials)` | Partially applies arguments from the left |
| `lodash.partialRight(func, ...partials)` | Partially applies arguments from the right |

## Usage

```ts
import { lodash } from "@/framework/facade.js";

// Debounce search input
const search = lodash.debounce(
  (query: string) => fetch(`/api?q=${query}`),
  300
);

// Throttle scroll handler
const onScroll = lodash.throttle(() => {
  console.log("scrolled");
}, 200);

// Memoize expensive computation
const factor = lodash.memoize((n: number) => {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
});

// Run callback only after 3 calls
const done = lodash.after(3, () => console.log("All ready!"));
```

## Reference

Refer to the [lodash function documentation](https://lodash.com/docs/#after) for the complete list of available methods.
