# Number

## Overview

The framework re-exports **lodash-es** via the facade for number utilities. These provide safe clamping, range checking, and random generation.

## Import

```ts
import { lodash } from "@/framework/facade.js";
```

## Common Methods

| Method | Purpose |
|---|---|
| `lodash.clamp(number, lower, upper)` | Clamps `number` within the inclusive range |
| `lodash.inRange(number, start, end)` | Checks if `number` is between `start` and `end` |
| `lodash.random(lower, upper, floating)` | Returns a random number in the range |

## Usage

```ts
import { lodash } from "@/framework/facade.js";

lodash.clamp(150, 0, 100);
// 100

lodash.clamp(-10, 0, 100);
// 0

lodash.inRange(5, 1, 10);
// true

lodash.inRange(15, 1, 10);
// false

lodash.random(1, 6);
// 4 (integer, like a die roll)

lodash.random(0, 1, true);
// 0.7341 (floating point)
```

## Reference

Refer to the [lodash number documentation](https://lodash.com/docs/#clamp) for the complete list of available methods.
