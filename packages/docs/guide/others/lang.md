# Lang

## Overview

The framework re-exports **lodash-es** via the facade for language-level utilities: type checking, cloning, and equality comparison.

## Import

```ts
import { lodash } from "@/framework/facade.js";
```

## Type Checking

| Method | Purpose |
|---|---|
| `lodash.isNil(value)` | Checks if `value` is `null` or `undefined` |
| `lodash.isNull(value)` | Checks if `value` is `null` |
| `lodash.isUndefined(value)` | Checks if `value` is `undefined` |
| `lodash.isNumber(value)` | Checks if `value` is a number |
| `lodash.isString(value)` | Checks if `value` is a string |
| `lodash.isBoolean(value)` | Checks if `value` is a boolean |
| `lodash.isArray(value)` | Checks if `value` is an array |
| `lodash.isObject(value)` | Checks if `value` is an object-like |
| `lodash.isPlainObject(value)` | Checks if `value` is a plain object (`{}`) |
| `lodash.isFunction(value)` | Checks if `value` is a function |
| `lodash.isDate(value)` | Checks if `value` is a `Date` |
| `lodash.isRegExp(value)` | Checks if `value` is a regex |
| `lodash.isSymbol(value)` | Checks if `value` is a symbol |
| `lodash.isMap(value)` | Checks if `value` is a `Map` |
| `lodash.isSet(value)` | Checks if `value` is a `Set` |
| `lodash.isWeakMap(value)` | Checks if `value` is a `WeakMap` |
| `lodash.isWeakSet(value)` | Checks if `value` is a `WeakSet` |
| `lodash.isNaN(value)` | Checks if `value` is `NaN` |
| `lodash.isEmpty(value)` | Checks if value is an empty object, collection, map, or set |
| `lodash.isElement(value)` | Checks if `value` is a DOM element |
| `lodash.isError(value)` | Checks if `value` is an error |

## Cloning & Equality

| Method | Purpose |
|---|---|
| `lodash.clone(value)` | Shallow clones a value |
| `lodash.cloneDeep(value)` | Deep clones a value (handles circular references) |
| `lodash.isEqual(a, b)` | Performs a deep comparison between two values |
| `lodash.isEqualWith(a, b, customizer)` | Deep comparison with customizer |

## Conversion

| Method | Purpose |
|---|---|
| `lodash.toArray(value)` | Converts value to an array |
| `lodash.toFinite(value)` | Converts value to a finite number |
| `lodash.toInteger(value)` | Converts value to an integer |
| `lodash.toNumber(value)` | Converts value to a number |
| `lodash.toString(value)` | Converts value to a string |

## Usage

```ts
import { lodash } from "@/framework/facade.js";

const user = { name: "Alice", nested: { age: 25 } };

// Deep clone
const cloned = lodash.cloneDeep(user);
cloned.nested.age = 30;
console.log(user.nested.age);
// 25 (original unchanged)

// Deep comparison
lodash.isEqual({ a: 1 }, { a: 1 });
// true

lodash.isEqual(NaN, NaN);
// true (unlike native)

// Type checks
lodash.isNil(null);    // true
lodash.isNil(undefined); // true
lodash.isNil(0);       // false
lodash.isNil("");      // false

lodash.isPlainObject({});       // true
lodash.isPlainObject(new Date()); // false
```

## Reference

Refer to the [lodash lang documentation](https://lodash.com/docs/#clone) for the complete list of available methods.
