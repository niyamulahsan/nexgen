# Password

## Overview

The password utility provides **bcrypt hashing and verification** for user passwords. It wraps bcryptjs with a fixed cost factor of 10.

## Password Utility

```ts
import { password } from "@/framework/facade.js";
```

| Method                                 | Purpose                                                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `password.hashPassword(input)`         | Hashes a plaintext password with bcrypt (cost 10). Returns the hash string. Use before storing in the database.         |
| `password.verifyPassword(input, hash)` | Compares a plaintext password against a stored hash. Returns `true` if they match, `false` otherwise. Use during login. |

## Usage

```ts
import { password } from "@/framework/facade.js";

// Hash before storing
const hash = await password.hashPassword("user-plaintext-password");

// Verify during login
const match = await password.verifyPassword("user-plaintext-password", hash);
// match === true or false
```

### Error handling

Both methods throw on invalid input (non-string, empty string, or already-hashed value passed to `hashPassword`). Wrap in `try/catch` for production code:

```ts
try {
  const hash = await password.hashPassword(input);
} catch (error) {
  // handle hashing error
}
```

## Configuration

Password settings are fixed — cost factor is 10, no configurable options.
