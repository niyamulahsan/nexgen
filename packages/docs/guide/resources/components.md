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

A searchable select component with infinite-scroll pagination and API data fetching. Built on `vue-select` — handles everything from simple static option lists to server-side paginated searches with dependent (cascade) dropdowns.

**Import:**
```vue
import Select from "@/components/Select.vue";
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fetched` | `() => FetchPack` | — | Function that returns the fetch config `{ url, data, mapFn, params?, option? }`. Zero-param standard — search/reset/reload handled internally |
| `must` | `boolean` | — | Show a required-field indicator (red dot next to label) |
| `err` | `string \| boolean` | — | Validation error text to display below the select |
| `hood` | `string \| boolean` | — | Optional hint/helper text displayed inline next to the label |
| `defaultValue` | `SelectValue` | `null` | Pre-select a value on mount |
| `resetKey` | `any` | `null` | **Cascade key.** When this value changes, the select clears + reloads. Used for dependent dropdowns (e.g., subcriteria reloads when criteria changes) |

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
  data: string;              // key in API response that holds paginated data
  params?: Record<string, any>;  // extra query params (e.g., filter by parent)
  mapFn?: (item) => Record<string, unknown>;  // transform API row → { id, title }
  option?: (value) => void;  // callback fired when selection changes
}
```

### Basic usage — API-fetched (zero-param)

The standard pattern: `fetched` is a zero-param function returning the fetch config. Search, reset, and reload are handled internally by the component.

```vue
<script setup lang="ts">
import Select from "@/components/Select.vue";

const user = ref(null);

const fetchUsers = () => ({
  url: "/api/users",
  data: "users",
  mapFn: (row: any) => ({ id: row.id, title: row.name }),
});
</script>

<template>
  <Select
    v-model="user"
    title="Select User"
    :fetched="fetchUsers"
    :err="form.errors?.user_id" />
</template>
```

### Dependent (cascade) dropdown with `resetKey`

When a parent select changes, the child automatically reloads via `resetKey`. The child's `fetched` function reactively reads the parent's value for its `params`.

```vue
<script setup lang="ts">
import Select from "@/components/Select.vue";

const form = reactive({ country: null, city: null });

const fetchCities = () => ({
  url: "/api/cities",
  data: "cities",
  params: { country_id: form.country?.id },
  mapFn: (row: any) => ({ id: row.id, title: row.name }),
});
</script>

<template>
  <Select v-model="form.country" title="Country" :fetched="fetchCountries" />

  <Select
    v-model="form.city"
    title="City"
    :fetched="fetchCities"
    :reset-key="form.country?.id" />
</template>
```

When `form.country` changes → `resetKey` changes on city select → select clears + reloads → `fetchCities` runs again, picks up the new `form.country?.id` in params.

### Wrapper when store function needs form data

When the fetch function lives in a store and needs component-scoped values, wrap it in an arrow:

**Store:**
```ts
// stores/city.ts
export const useCityStore = defineStore("city", () => {
  const fetchCities = ({ countryId }: { countryId?: number } = {}) => ({
    url: "/api/cities",
    data: "cities",
    params: { country_id: countryId },
    mapFn: (row: any) => ({ id: row.id, title: row.name }),
  });

  return { fetchCities };
});
```

**Component:**
```vue
<script setup lang="ts">
import { useCityStore } from "@/stores/city";
const cityStore = useCityStore();
</script>

<template>
  <Select
    v-model="form.city"
    title="City"
    :fetched="() => cityStore.fetchCities({ countryId: form.country?.id })"
    :reset-key="form.country?.id" />
</template>
```

### `option` callback for side effects

Use `option` to react when selection changes (e.g., clear dependent selects):

```vue
<script setup lang="ts">
const fetchCategories = () => ({
  url: "/api/categories",
  data: "categories",
  mapFn: (row: any) => ({ id: row.id, title: row.name }),
  option: (val: any) => {
    form.category = val;
    form.subcategory = null; // clear child on category change
  },
});

const fetchSubcategories = () => ({
  url: "/api/subcategories",
  data: "subcategories",
  params: { category_id: form.category?.id },
  mapFn: (row: any) => ({ id: row.id, title: row.name }),
});
</script>

<template>
  <Select v-model="form.category" title="Category" :fetched="fetchCategories" />
  <Select
    v-model="form.subcategory"
    title="Subcategory"
    :fetched="fetchSubcategories"
    :reset-key="form.category?.id" />
</template>
```

### Static options (no API)

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
  <Select v-model="role" title="Role" :options="roles" label="title" />
</template>
```

### Edit mode — populating cascading dropdowns

When editing a record that has cascade-dependent selects, you **must** `await nextTick()` between each cascade level in `setForm`. This gives the child Select's `resetKey` watch time to fire, clear the old value, and reload options before you set the next level's value.

```vue
<script setup lang="ts">
import { nextTick } from "vue";
import Select from "@/components/Select.vue";

const form = reactive({
  country: null,
  city: null,
  area: null,
});

const setForm = async (row: any) => {
  form.country = row.countryId
    ? { id: row.countryId, title: row.countryName }
    : null;
  await nextTick(); // let city select reset + reload with new countryId

  form.city = row.cityId
    ? { id: row.cityId, title: row.cityName }
    : null;
  await nextTick(); // let area select reset + reload with new cityId

  form.area = row.areaId
    ? { id: row.areaId, title: row.areaName }
    : null;
};
</script>

<template>
  <Select v-model="form.country" title="Country" :fetched="fetchCountries" />

  <Select
    v-model="form.city"
    title="City"
    :fetched="() => fetchCities({ countryId: form.country?.id })"
    :reset-key="form.country?.id" />

  <Select
    v-model="form.area"
    title="Area"
    :fetched="() => fetchAreas({ cityId: form.city?.id })"
    :reset-key="form.city?.id" />
</template>
```

**Why `nextTick` is required:** When you set `form.country`, the city Select's `resetKey` changes, triggering its internal watch. That watch clears the city model (setting it to `null`) and fetches fresh options. Without `nextTick`, setting `form.city` immediately after `form.country` would be overwritten by the watch. `nextTick` lets the flush complete so the child resets first, then you can safely set its value.

**Do NOT use `nextTick` for user cascade.** The `resetKey` watch handles that automatically — user changes a parent → watch fires → child clears + reloads. `nextTick` is only needed in `setForm` when programmatically restoring all cascade levels at once.
