<template>
  <div class="position-relative mb-2">
    <label
      for="select"
      class="position-relative form-label text-capitalize d-flex align-items-centre"
      :class="{ 'd-none': !inputTitle }">
      <div class="position-relative">
        <span class="text-capitalize" v-html="inputLabel"></span>
        <span
          class="position-absolute text-danger rounded-circle bg-danger must"
          :class="{ 'd-none': !props.must }"></span>
      </div>
      <span class="text-capitalize">{{ inputTitle }}</span>
      <span
        class="text-danger rounded-circle bg-danger must"
        :class="{ 'd-none': !props.must }"></span>
    </label>
    <v-select id="select" v-model="model" v-bind="$attrs" />
    <div class="form-text text-danger" :class="{ 'd-none': !props.err }" style="font-size: 0.8rem">
      {{ props.err }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { watchEffect, computed, useAttrs } from "vue";
import vSelect from "vue-select";
import "vue-select/dist/vue-select.css";

defineOptions({ name: "Select", inheritAttrs: false });

interface SelectProps {
  must?: boolean;
  err?: string | boolean;
  fetched?: () => void | Promise<void>;
}

const $attrs = useAttrs();
const props = defineProps<SelectProps>();

const inputLabel = computed(() => ($attrs.label as string | undefined) || "");
const inputTitle = computed(() => ($attrs.title as string | undefined) || "");

type SelectModel = string | number | boolean | Record<string, unknown> | null;

const model = defineModel<SelectModel | SelectModel[]>();

watchEffect(async () => {
  if (!props.fetched) {
    return;
  }

  await props.fetched();
});
</script>

<style lang="scss" scoped>
.vs__dropdown-toggle {
  padding: 0.27rem 0;
  margin-bottom: 3px;
}

.vs__dropdown-menu {
  max-height: 225px;
  min-width: 100px !important;
  right: 0 !important;
  left: auto !important;
}

.must {
  width: 4px;
  height: 4px;
  margin-left: 2px;
  margin-top: 5px;
}

.vs__dropdown-toggle {
  border-radius: 5px;
}
</style>
