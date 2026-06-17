<template></template>

<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, useAttrs } from "vue";

defineOptions({ name: "FeatureButton", inheritAttrs: false });

const props = defineProps<{
  icon?: string;
  label?: string;
  title?: string;
  attrs?: Record<string, string>;
}>();

const emit = defineEmits<(e: "click") => void>();

interface ButtonEntry {
  id: symbol;
  icon?: string;
  label: string;
  title: string;
  attrs?: Record<string, string>;
  onClick: () => void;
}

const featureButtons = inject<ButtonEntry[]>("featureButtons")!;

const rawAttrs = useAttrs();
const { class: _c, style: _s, ...extra } = rawAttrs;

const id = Symbol();

onMounted(() => {
  featureButtons.push({
    id,
    icon: props.icon,
    label: props.label ?? "",
    title: props.title ?? props.label ?? "",
    attrs: { ...(extra as Record<string, string>), ...props.attrs },
    onClick: () => emit("click")
  });
});

onBeforeUnmount(() => {
  const index = featureButtons.findIndex((b) => b.id === id);
  if (index !== -1) featureButtons.splice(index, 1);
});
</script>

<style lang="scss" scoped></style>
