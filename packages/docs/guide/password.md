# Password

## Overview

The password utility provides **bcrypt hashing and verification** for user passwords. It wraps bcryptjs with a fixed cost factor of 10.

## Password Utility

```ts
import { password } from "@/framework/facade.js";
```

| Method | Purpose |
|---|---|
| `password.hashPassword(input)` | Hashes a plaintext password with bcrypt (cost 10). Use before storing in the database. |
| `password.verifyPassword(input, hash)` | Compares a plaintext password against a stored hash. Use during login. |

## Usage

```ts
import { password } from "@/framework/facade.js";

// Hash before storing
const hash = await password.hashPassword("user-plaintext-password");

// Verify during login
const match = await password.verifyPassword("user-plaintext-password", hash);
```
