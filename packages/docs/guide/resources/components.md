# Components

The framework ships a library of 19 reusable Vue components under `src/resources/src/components/`.

## Component list

| Component | Description |
|-----------|-------------|
| `Button` | Styled button with label/icon/slot |
| `Input` | Text input with label, formatting categories, maxlength counter, error display |
| `InputPasswordToggle` | Password input with show/hide toggle |
| `InputGroup` | Two-part input (editable + readonly) |
| `Select` | Searchable select with infinite-scroll, pagination, and API fetching (wraps `vue-select`) |
| `TextArea` | Textarea with floating label & maxlength counter |
| `Checkbox` | Checkbox with v-model |
| `Switch` | Toggle switch |
| `Modal` | Bootstrap modal via teleport into `#modal-show` |
| `Toast` | Bootstrap toast via teleport |
| `Spinner` | Loading spinner |
| `DataTable` | Full data table with search, pagination, column sorting, skeleton loading |
| `Pagebar` | Teleports title into the header's page title area |
| `Refresh` | Binds a click handler to the header's refresh button |
| `Href` | Styled anchor link |
| `FloatButton` | Positioned fixed action button |

## DataTable

A fully-featured data table component with server-side pagination, search, bulk delete, and configurable page size. Works with any paginated API response via the `PaginatedData` interface.

**Import:**
```vue
import DataTable from "@/components/datatable/index.vue";
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `PaginatedData` | required | Server response with `{ data, current_page, last_page, per_page, total, path }` |
| `search` | `string` | `""` | Initial search query |
| `loop` | `DataRow[] \| false` | — | Override rows (useful for local data). Falls back to `data.data` |
| `option` | `(string \| number)[]` | `[]` | Per-page size options for the "Show X entries" dropdown |
| `removable` | `boolean` | `true` | Show checkboxes and trash button for bulk delete |
| `countable` | `boolean` | `true` | Show row number column |
| `searchable` | `boolean` | `true` | Show search input in header |
| `optionable` | `boolean` | `true` | Show "Show X entries" dropdown |
| `disabled` | `boolean` | `false` | Disable all interactive elements |

### Slots

| Slot | Bindings | Description |
|------|----------|-------------|
| `extra-tools` | — | Additional buttons/controls in the card header (right side) |
| `extra` | — | Content inserted before the table (inside card body) |
| `customhead` | — | Replace the entire `<thead>` (hides default thead) |
| `thead` | — | Extra `<th>` columns appended after checkbox + `#` columns |
| `custombody` | — | Replace the entire `<tbody>` (hides default tbody) |
| `tbody` | `{ td: DataRow }` | Per-row `<td>` columns. Use `<slot name="tbody" :td="dt">` in parent |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `remove` | `(string \| number)[]` | Emitted when the trash button is clicked, with selected row IDs |

### `PaginatedData` interface

```ts
interface PaginatedData {
  data: DataRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  path: string;
}
```

### Usage with server-side pagination

```vue
<script setup lang="ts">
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import DataTable from "@/components/datatable/index.vue";
import { usePostsStore } from "@/stores/posts";

const route = useRoute();
const store = usePostsStore();
const { posts } = storeToRefs(store);

const search = computed(() => String(route.query.search || ""));

watch(
  () => route.query,
  async () => {
    await store.fetchPosts({
      page: Number(route.query.page || 1),
      size: Number(route.query.size || 10),
      search: String(route.query.search || "")
    });
  },
  { immediate: true }
);
</script>

<template>
  <div class="card">
    <div class="card-body">
      <DataTable
        :data="posts"
        :search="search"
        :option="[10, 25, 50, 100]"
        :removable="true"
        :countable="true"
        @remove="(ids) => console.log('Delete', ids)">
        <template #thead>
          <th>Title</th>
          <th>Author</th>
          <th>Created</th>
        </template>
        <template #tbody="{ td }">
          <td>{{ td.title }}</td>
          <td>{{ td.author }}</td>
          <td>{{ td.created_at }}</td>
        </template>
      </DataTable>
    </div>
  </div>
</template>
```

## Select

A searchable select component with infinite-scroll pagination and API data fetching. Built on `vue-select` — handles everything from simple static option lists to server-side paginated searches.

**Import:**
```vue
import Select from "@/components/Select.vue";
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fetched` | `(payload) => FetchPack \| null` | — | Callback that returns the fetch config for a given search term |
| `must` | `boolean` | — | Show a required-field indicator (red dot next to label) |
| `err` | `string \| boolean` | — | Validation error text to display below the select |
| `hood` | `string \| boolean` | — | Optional hint/helper text displayed inline next to the label |
| `defaultValue` | `SelectValue` | `null` | Pre-select a value on mount |
| `resetKey` | `any` | `null` | When this value changes, the select clears and reloads |

### Inherited via `v-bind="$attrs"`

| Attr | Type | Description |
|------|------|-------------|
| `id` | `string` | Sets `for` on the label |
| `title` | `string` | Label text |
| `parentclass` | `string` | CSS class on the wrapper div (default `"mb-2"`) |
| `multiple` | `boolean` | Enable multi-select |
| `options` | `array` | Static options array (for non-API mode) |
| `label` | `string` | Key to use as display label in options |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `fetched` | — | Emitted after options are fetched |
| `clear` | — | Emitted when the selection is cleared |

### Exposed methods

| Method | Description |
|--------|-------------|
| `reload()` | Reset selection and re-fetch first page |

### `FetchPack` interface

```ts
interface FetchPack {
  url: string;
  data: string;
  params?: Record<string, unknown>;
  mapFn?: (item) => Record<string, unknown>;
  option?: (value) => void;
}
```

### Basic usage — API-fetched with pagination

```vue
<script setup lang="ts">
import Select from "@/components/Select.vue";

const user = ref(null);

function fetchUsers({ search, reset, reload }) {
  return {
    url: "/api/users",
    data: "users",
    params: { search },
    mapFn: (row) => ({ id: row.id, title: row.name }),
  };
}
</script>

<template>
  <Select
    v-model="user"
    id="user-select"
    title="Select User"
    :fetched="fetchUsers"
    :err="form.errors?.user_id" />
</template>
```

### Usage with multiple and reset

```vue
<script setup lang="ts">
import Select from "@/components/Select.vue";

const categories = ref([]);
const categoryResetKey = ref(null);

function fetchCategories({ search, reset, reload }) {
  return {
    url: "/api/categories",
    data: "categories",
    params: { search },
    mapFn: (row) => ({ id: row.id, title: row.name }),
  };
}

function clearCategories() {
  categoryResetKey.value = Date.now();
}
</script>

<template>
  <Select
    v-model="categories"
    id="category-select"
    title="Categories"
    :fetched="fetchCategories"
    :reset-key="categoryResetKey"
    multiple />
</template>
```

### Usage with static options (no API)

```vue
<script setup lang="ts">
import Select from "@/components/Select.vue";

const role = ref(null);
const roles = [
  { id: 1, title: "Admin" },
  { id: 2, title: "Editor" },
  { id: 3, title: "Viewer" },
];
</script>

<template>
  <Select
    v-model="role"
    title="Role"
    :options="roles"
    label="title" />
</template>
```
