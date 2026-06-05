# Helpers

Utility functions live in `src/resources/src/helpers/`.

## `nformatter.ts`

Number formatting utilities:

```ts
// Format a number with locale-aware separators
formatNumber(value: number): string

// Format as currency
formatCurrency(value: number, currency?: string): string

// Format as percentage
formatPercentage(value: number, decimals?: number): string
```

## `utils.ts`

General-purpose utility functions:

```ts
// Deep clone an object
deepClone<T>(obj: T): T

// Debounce a function call
debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void

// Generate a unique ID
uniqueId(prefix?: string): string

// Truncate a string with ellipsis
truncate(str: string, maxLength: number): string
```
