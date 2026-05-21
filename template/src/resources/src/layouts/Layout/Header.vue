<template>
  <header :class="{ scrolled: isScrolled }">
    <nav class="navbar bg-transparent p-0">
      <div class="container-fluid p-0 row-gap-2 column-gap-1">
        <button
          id="off-canvas"
          type="button"
          class="nav-btn order-0"
          title="Toggle Button"
          @click="props.onToggleSidebar">
          <i class="bi bi-layout-text-sidebar-reverse"></i>
        </button>
        <div id="pagebar" class="card card-body nav-card order-5 order-sm-1"></div>
        <button id="refresh" type="button" class="nav-btn order-3 order-sm-2" aria-label="button">
          <i class="bi bi-arrow-repeat"></i>
        </button>
        <div class="btn-group order-4 order-sm-3">
          <button
            type="button"
            class="nav-btn w-100"
            data-bs-toggle="dropdown"
            data-bs-display="static"
            aria-expanded="false"
            aria-label="button">
            <i class="bi bi-person-circle"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li>
              <a class="dropdown-item" href="#">
                <div class="d-flex align-items-center">
                  <div class="flex-shrink-0 me-3">
                    <i class="bi bi-person-circle fs-1"></i>
                  </div>
                  <div class="flex-grow-1 text-capitalize">
                    <h6 class="mb-0">{{ authUser?.name }}</h6>
                    <small class="text-muted">{{ authUser.role?.name }}</small>
                  </div>
                </div>
              </a>
            </li>
            <li>
              <div class="dropdown-divider my-1"></div>
            </li>
            <li>
              <a class="dropdown-item" href="#">
                <i class="bi bi-person-check me-3"></i><span>My Profile</span>
              </a>
            </li>
            <li>
              <button type="button" class="dropdown-item" @click="props.onLogout">
                <i class="bi bi-power me-3"></i><span>Log Out</span>
              </button>
            </li>
          </ul>
        </div>
        <button
          id="theme-switch"
          type="button"
          class="nav-btn order-1 order-sm-4"
          aria-label="button"
          @click="props.onToggleTheme">
          <i :class="themeIconClass"></i>
        </button>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { authUser } from "@/composables/useAuth";

interface HeaderProps {
  isScrolled: boolean;
  themeMode: "light" | "dark" | "auto";
  onLogout: () => void | Promise<void>;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
}

const props = defineProps<HeaderProps>();

const themeIconClass = computed(() => {
  if (props.themeMode === "light") return "bi bi-brightness-high-fill";
  if (props.themeMode === "dark") return "bi bi-moon-stars";
  return "bi bi-circle-half";
});
</script>

<style lang="scss" scoped></style>
