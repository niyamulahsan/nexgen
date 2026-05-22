# String

## Overview

The framework re-exports **lodash-es** via the facade for string manipulation. Use it for case conversion, trimming, escaping, and other common string operations.

## Import

```ts
import { lodash } from "@/framework/facade.js";
```

## Common Methods

| Method | Purpose |
|---|---|
| `lodash.camelCase(string)` | Converts to camelCase |
| `lodash.snakeCase(string)` | Converts to snake_case |
| `lodash.kebabCase(string)` | Converts to kebab-case |
| `lodash.pascalCase(string)` | Converts to PascalCase |
| `lodash.startCase(string)` | Converts to Start Case |
| `lodash.lowerCase(string)` | Converts to lower case spaced |
| `lodash.upperCase(string)` | Converts to UPPER CASE SPACED |
| `lodash.trim(string)` | Removes leading and trailing whitespace |
| `lodash.truncate(string, options)` | Truncates string to a specified length |
| `lodash.escape(string)` | Escapes HTML entities |
| `lodash.unescape(string)` | Unescapes HTML entities |
| `lodash.pad(string, length, chars)` | Pads on both sides |
| `lodash.padStart(string, length, chars)` | Pads the start |
| `lodash.padEnd(string, length, chars)` | Pads the end |
| `lodash.repeat(string, n)` | Repeats the string n times |
| `lodash.replace(string, pattern, replacement)` | Replaces matches |
| `lodash.split(string, separator, limit)` | Splits the string |
| `lodash.template(string, data)` | Compiles a template string |
| `lodash.deburr(string)` | Removes diacritical marks |

## Usage

```ts
import { lodash } from "@/framework/facade.js";

lodash.camelCase("hello world");
// "helloWorld"

lodash.snakeCase("hello world");
// "hello_world"

lodash.kebabCase("Hello World");
// "hello-world"

lodash.truncate("A very long string that should be shortened", { length: 20 });
// "A very long string..."

lodash.escape("<script>alert('xss')</script>");
// "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"
```

## Reference

Refer to the [lodash string documentation](https://lodash.com/docs/#camelCase) for the complete list of available methods.
