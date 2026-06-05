# Validation

The frontend uses the backend's Zod schemas for validation. When a form submission fails, the API returns validation errors that are surfaced automatically in form components.

## Error format

Validation errors are returned as an object keyed by field name:

```json
{
  "email": ["The email field is required."],
  "password": ["The password must be at least 8 characters."]
}
```

## In components

The Gum plugin normalises errors from the API into `form.errors`:

```vue
<script setup lang="ts">
import { useGumForm } from "@/plugins/gum";

const form = useGumForm({ email: "", password: "" });

async function handleSubmit() {
  form.post("/api/auth/login", undefined, {
    onSuccess: () => { /* redirect */ },
    onError: () => { /* errors populate automatically */ }
  });
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <Input v-model="form.data.email" label="Email" :err="form.errors?.email" />
    <InputPasswordToggle v-model="form.data.password" label="Password" :err="form.errors?.password" />
    <Button type="submit" label="Sign In" :loading="form.processing" />
  </form>
</template>
```

## Error display per component

| Component | Prop | Example |
|-----------|------|---------|
| `Input` | `err` | `:err="form.errors?.email"` |
| `InputPasswordToggle` | `err` | `:err="form.errors?.password"` |
| `Select` | `err` | `:err="form.errors?.user_id"` |
| `TextArea` | `err` | `:err="form.errors?.bio"` |

When `err` is a string, it displays as red text below the input. When `err` is an array (from nested errors), join or display the first element.
