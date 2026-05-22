# Date

## Overview

The framework uses **luxon** for date and time manipulation. Luxon provides a modern, immutable, and fully-featured API built on top of the native `Intl` API.

## Import

```ts
import { DateTime } from "luxon";
```

## Creating Dates

| Method | Purpose |
|---|---|
| `DateTime.now()` | Returns the current date and time in the system zone |
| `DateTime.local(year, month, day)` | Creates a date from local components |
| `DateTime.utc(year, month, day)` | Creates a date in UTC |
| `DateTime.fromISO(string)` | Parses an ISO 8601 string |
| `DateTime.fromJSDate(date)` | Converts a native `Date` object |
| `DateTime.fromMillis(milliseconds)` | From Unix milliseconds |
| `DateTime.fromSeconds(seconds)` | From Unix seconds |
| `DateTime.fromFormat(string, format)` | Parses a formatted string |

## Formatting

| Method | Purpose |
|---|---|
| `.toISO()` | Returns ISO 8601 string |
| `.toFormat(format)` | Formats using tokens (`yyyy-MM-dd`, `HH:mm:ss`, etc.) |
| `.toLocaleString()` | Locale-aware string |
| `.toRelative()` | Relative time ("2 hours ago") |
| `.toRelativeCalendar()` | Calendar relative ("yesterday", "next month") |
| `.toMillis()` | Unix milliseconds |
| `.toSeconds()` | Unix seconds |
| `.toJSDate()` | Converts to native `Date` |

## Manipulation

| Method | Purpose |
|---|---|
| `.plus({ days: 1 })` | Add time (also: `months`, `years`, `hours`, `minutes`, `seconds`) |
| `.minus({ weeks: 2 })` | Subtract time |
| `.startOf("day")` | Start of the unit ("month", "week", "day", "hour") |
| `.endOf("month")` | End of the unit |
| `.set({ hour: 0, minute: 0 })` | Set specific components |

## Comparison

| Method | Purpose |
|---|---|
| `.hasSame(other, "day")` | Check if same unit ("year", "month", "day") |
| `.diff(other, "days")` | Returns a Duration between two dates |
| `.diffNow("hours")` | Difference from now |
| `.equals(other)` | Exact equality check |
| `dt1 < dt2` | Comparison operators work (via `.valueOf()`) |

## Usage

```ts
import { DateTime } from "luxon";

// Current time
const now = DateTime.now();

// Parsing
const dt = DateTime.fromISO("2026-05-22T10:30:00");
dt.toFormat("yyyy-MM-dd HH:mm:ss");
// "2026-05-22 10:30:00"

// Manipulation
const nextWeek = DateTime.now().plus({ weeks: 1 });
const startOfMonth = DateTime.now().startOf("month");

// Formatting
DateTime.now().toRelative();
// "just now" | "5 minutes ago" | "2 hours ago"

// Difference
const a = DateTime.fromISO("2026-01-01");
const b = DateTime.fromISO("2026-05-22");
const diff = b.diff(a, "days").days;
// 141

// Timezone
const ny = DateTime.now().setZone("America/New_York");
const tokyo = DateTime.now().setZone("Asia/Tokyo");
```

## Durations

```ts
import { Duration } from "luxon";

const dur = Duration.fromObject({ hours: 3, minutes: 30 });
dur.as("minutes");
// 210

dur.toFormat("h:mm");
// "3:30"
```

## Reference

Refer to the [luxon documentation](https://moment.github.io/luxon/) for the complete API reference.
