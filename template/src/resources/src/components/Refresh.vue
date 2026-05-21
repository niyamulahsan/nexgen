<template></template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

defineOptions({ name: "Refresh", inheritAttrs: false });

const emit = defineEmits<{
  (event: "click"): void;
}>();

let target: HTMLElement | null = null;
const onRefreshClick = () => emit("click");

onMounted(() => {
  target = document.getElementById("refresh");
  target?.addEventListener("click", onRefreshClick);
});

onBeforeUnmount(() => {
  target?.removeEventListener("click", onRefreshClick);
  target = null;
});
</script>

<style lang="scss" scoped></style>
