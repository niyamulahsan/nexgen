<template>
  <Teleport to="#modal-show">
    <div
      :id="props.id"
      ref="modal"
      class="modal fade"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      :aria-labelledby="`${props.id}Label`">
      <div
        :class="`modal-dialog modal-dialog-centered modal-dialog-scrollable modal-${props.size}`">
        <div class="modal-content border">
          <div class="modal-header">
            <div class="d-flex w-100 justify-content-between align-items-center">
              <h5 id="modalScrollableTitle" class="modal-title me-3">{{ props.title }}</h5>
              <button
                type="button"
                class="btn-close shadow-none"
                data-bs-dismiss="modal"
                aria-label="Close"></button>
              <slot name="modal-header-extra"></slot>
            </div>
          </div>
          <div class="modal-body">
            <slot name="modalbody"></slot>
          </div>
          <div class="modal-footer py-2">
            <slot name="modalfooter"></slot>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Modal } from "bootstrap";

type ModalSize = "sm" | "md" | "lg" | "xl" | string;

interface ModalProps {
  id: string;
  title?: string;
  size?: ModalSize;
}

defineOptions({ name: "Modal", inheritAttrs: false });

const props = withDefaults(defineProps<ModalProps>(), {
  title: "",
  size: "md"
});

const modal = ref<HTMLElement | null>(null);
let modalInstance: Modal | null = null;

const getOrCreateModal = () => {
  if (!modal.value) {
    return null;
  }

  if (!modalInstance) {
    modalInstance = new Modal(modal.value, {
      backdrop: "static",
      keyboard: false
    });
  }

  return modalInstance;
};

onMounted(() => {
  getOrCreateModal();
});

const open = () => {
  getOrCreateModal()?.show();
};

const close = () => {
  const instance = getOrCreateModal();
  if (!instance) {
    return;
  }

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur(); // to avoid aria-hidden warning
  }
  instance.hide();
};

onBeforeUnmount(() => {
  modalInstance?.dispose();
  modalInstance = null;
});

defineExpose({ close, open });
</script>

<style lang="scss" scoped></style>
