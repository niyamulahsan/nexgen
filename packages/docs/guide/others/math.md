# Math

## Overview

The framework re-exports **lodash-es** via the facade for math operations. These provide consistent arithmetic, rounding, and aggregation utilities.

## Import

```ts
import { lodash } from "@/framework/facade.js";
```

## Common Methods

| Method | Purpose |
|---|---|
| `lodash.add(a, b)` | Adds two numbers |
| `lodash.subtract(a, b)` | Subtracts `b` from `a` |
| `lodash.multiply(a, b)` | Multiplies two numbers |
| `lodash.divide(a, b)` | Divides `a` by `b` |
| `lodash.sum(array)` | Returns the sum of an array |
| `lodash.sumBy(array, iteratee)` | Sums by iteratee |
| `lodash.mean(array)` | Returns the mean average |
| `lodash.meanBy(array, iteratee)` | Mean by iteratee |
| `lodash.max(array)` | Returns the maximum value |
| `lodash.maxBy(array, iteratee)` | Max by iteratee |
| `lodash.min(array)` | Returns the minimum value |
| `lodash.minBy(array, iteratee)` | Min by iteratee |
| `lodash.ceil(number, precision)` | Rounds up to `precision` decimal places |
| `lodash.floor(number, precision)` | Rounds down to `precision` decimal places |
| `lodash.round(number, precision)` | Rounds to `precision` decimal places |

## Usage

```ts
import { lodash } from "@/framework/facade.js";

const prices = [19.99, 29.99, 39.99, 49.99];

lodash.sum(prices);
// 139.96

lodash.mean(prices);
// 34.99

lodash.round(3.14159, 2);
// 3.14

lodash.ceil(3.14159, 2);
// 3.15

const items = [
  { name: "A", price: 10 },
  { name: "B", price: 20 },
  { name: "C", price: 30 },
];

lodash.sumBy(items, "price");
// 60

lodash.maxBy(items, "price");
// { name: "C", price: 30 }
```

## Reference

Refer to the [lodash math documentation](https://lodash.com/docs/#add) for the complete list of available methods.
