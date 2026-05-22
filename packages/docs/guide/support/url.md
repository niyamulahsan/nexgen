# URL

## Overview

The URL utility provides helpers for building **absolute application URLs** from the configured `APP_URL`. Use it when generating links for emails, API responses, or redirects.

## URL Utility

```ts
import { urls } from "@/framework/facade.js";
```

| Method | Purpose |
|---|---|
| `urls.appUrl()` | Returns the base application URL with trailing slash removed. Use as a base for absolute links. |
| `urls.url(path)` | Builds a full absolute URL by joining `APP_URL` with the given path. Handles slash normalization. |

## Usage

```ts
import { urls } from "@/framework/facade.js";

urls.appUrl();
// "https://example.com"

urls.url("/reset-password?token=abc");
// "https://example.com/reset-password?token=abc"

urls.url("api/health");
// "https://example.com/api/health"
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APP_URL` | — | **Required.** Base URL of the application |
