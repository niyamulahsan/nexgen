<template>
  <Pagebar title="Dashboard" />
  <!-- <Refresh @click="hardRefresh" /> -->

  <div class="dashboard-placeholder">
    <div class="row g-2 mb-2">
      <div class="col-12 col-md-4">
        <div class="placeholder-card"></div>
      </div>
      <div class="col-12 col-md-4">
        <div class="placeholder-card"></div>
      </div>
      <div class="col-12 col-md-4">
        <div class="placeholder-card"></div>
      </div>
    </div>

    <div class="placeholder-panel"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useHead } from "@vueuse/head";
import { pulse } from "@/plugins/pulse";
import { useAuth } from "@/composables/useAuth";
import Pagebar from "@/components/Pagebar.vue";
import Refresh from "@/components/Refresh.vue";

useHead({ title: "Dashboard" });

const { user } = useAuth();

let unsubscribe: (() => void) | null = null;

onMounted(() => {
  if (!user.value) return;

  const channel = pulse.channel(`user:${user.value.id}`);
  channel.listen("user.registered", () => alert("me"));
  unsubscribe = () => channel.stopListening("user.registered");
});

onUnmounted(() => {
  unsubscribe?.();
});

// const hardRefresh = () => window.location.reload();
</script>

<style scoped>
.placeholder-card,
.placeholder-panel {
  border: 1px solid var(--app-border);
  border-radius: 0.3rem;
  background: var(--app-surface);
}

.placeholder-card {
  min-height: 220px;
}

.placeholder-panel {
  min-height: 520px;
}

@media (max-width: 768px) {
  .placeholder-card {
    min-height: 160px;
  }

  .placeholder-panel {
    min-height: 360px;
  }
}
</style>
