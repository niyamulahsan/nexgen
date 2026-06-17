<template>
  <Teleport v-if="target" :to="target">
    <slot v-if="hasDefaultSlot" />
    <p v-else-if="props.title" class="m-0 fs-4">{{ props.title }}</p>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useSlots } from "vue";

defineOptions({ name: "PageBar", inheritAttrs: false });

interface PageBarProps {
  title?: string;
}

const props = defineProps<PageBarProps>();
const slots = useSlots();

const target = ref<HTMLElement | null>(null);
const hasDefaultSlot = computed(() => Boolean(slots.default?.().length));

onMounted(() => {
  target.value = document.getElementById("pagebar");
});
</script>

<style lang="scss" scoped></style>
