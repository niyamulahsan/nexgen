# Pages

Pages are single-file components under `src/resources/src/pages/`. Each page is lazy-loaded by the router.

## Dashboard page example

```vue
<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { pulse } from "@/plugins/pulse";

const auth = useAuthStore();

if (auth.user) {
  const channel = pulse.channel(`user:${auth.user.id}`);
  channel.listen("notification.created", (payload: any) => {
    // handle real-time notification
  });
}
</script>

<template>
  <div class="row">
    <div class="col-12">
      <h1>Welcome, {{ auth.user?.name }}</h1>
    </div>
  </div>
</template>
```

## Auth page example

```vue
<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import Button from "@/components/Button.vue";

const auth = useAuthStore();
const router = useRouter();

const form = ref({ email: "", password: "" });

async function handleLogin() {
  await auth.login(form.value);
  const redirect = router.currentRoute.value.query.redirect as string;
  router.push(redirect || "/");
}
</script>

<template>
  <form @submit.prevent="handleLogin">
    <Input v-model="form.email" label="Email" type="email" />
    <InputPasswordToggle v-model="form.password" label="Password" />
    <Button label="Sign In" type="submit" block />
  </form>
</template>
```

## Directory structure

```
src/resources/src/pages/
├── auth/
│   ├── login.vue
│   ├── register.vue
│   ├── forgetPassword.vue
│   ├── resetPassword.vue
│   └── verifyEmail.vue
├── dashboard/
│   └── index.vue
└── (your feature pages)
```

Each feature area gets its own subdirectory under `pages/` with an `index.vue` as the main entry.

## Complete example: Posts page with realtime

This example combines stores, Gum, Pulse, DataTable, Pagebar, and route query sync:

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { usePostsStore } from "@/stores/posts";
import { pulse } from "@/plugins/pulse";
import { useGum } from "@/plugins/gum";

import Pagebar from "@/components/Pagebar.vue";
import DataTable from "@/components/datatable/index.vue";

const route = useRoute();
const auth = useAuthStore();
const store = usePostsStore();
const { posts } = storeToRefs(store);
const gum = useGum();

const search = computed(() => String(route.query.search || ""));

function queryParams() {
  return {
    page: Number(route.query.page || 1),
    size: Number(route.query.size || 10),
    search: String(route.query.search || "")
  };
}

let channel: any;

watch(
  () => route.query,
  async () => {
    await store.fetchPosts(queryParams());
  },
  { immediate: true }
);

onMounted(() => {
  if (auth.user) {
    channel = pulse.channel(`user:${auth.user.id}`);
    channel.listen("post.created", async () => {
      await store.fetchPosts(queryParams());
    });
  }
});

async function remove(ids: number[]) {
  await gum.delete(`/api/posts/${ids[0]}`, {
    preserveScroll: true,
    preserveState: true,
    onSuccess: async () => {
      await store.fetchPosts(queryParams());
    }
  });
}

onUnmounted(() => {
  if (channel) {
    channel.stopListening("post.created");
    pulse.leave(`user:${auth.user.id}`);
  }
});
</script>

<template>
  <Pagebar>Posts</Pagebar>

  <div class="card">
    <div class="card-body">
      <DataTable
        :data="posts"
        :search="search"
        :option="[10, 25, 50]"
        @remove="remove">
        <template #thead>
          <th>Title</th>
          <th>Status</th>
          <th>Created</th>
        </template>
        <template #tbody="{ td }">
          <td>{{ td.title }}</td>
          <td>{{ td.status }}</td>
          <td>{{ td.created_at }}</td>
        </template>
      </DataTable>
    </div>
  </div>
</template>
```
