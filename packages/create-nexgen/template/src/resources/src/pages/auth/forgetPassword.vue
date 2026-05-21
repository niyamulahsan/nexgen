<template>
  <div class="container position-absolute start-50 top-50 translate-middle">
    <div class="auth col-12 col-sm-9 col-md-7 col-lg-5 col-xl-4 mx-auto py-5">
      <div class="card card-body border-0">
        <div class="d-block mb-2">
          <h3 class="m-0 text-uppercase text-center fw-semibold">nexgen</h3>
        </div>
        <h4 class="text-center">Forget Password</h4>
        <p
          v-if="message"
          class="text-center alert py-1 mt-2"
          :class="isError ? 'alert-danger text-danger' : 'alert-success text-success'">
          {{ message }}
        </p>
        <form id="formAuthentication" @submit.prevent="onSubmit">
          <div class="mb-4">
            <Input
              id="email"
              v-model="form.email"
              type="email"
              label="email"
              placeholder="Enter your email..."
              :err="false"
              focus
              must />
          </div>
          <Button
            type="submit"
            label="Send Reset Link"
            class="btn btn-primary d-grid w-100"
            icon="bi bi-send ms-2"
            :disabled="auth.processing" />
        </form>
        <div class="text-center mt-2">
          <router-link to="/login">
            <i class="bx bx-chevron-left scaleX-n1-rtl me-1"></i>
            <span>Back to login</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useHead } from "@vueuse/head";
import Input from "../../components/Input.vue";
import Button from "../../components/Button.vue";
import { useAuthStore } from "@/stores/auth";

useHead({ title: "Forget Password" });

const auth = useAuthStore();

interface ForgotPasswordForm {
  email: string;
}

const form = reactive<ForgotPasswordForm>({ email: "" });
const message = ref("");
const isError = ref(false);

const onSubmit = async () => {
  message.value = "";
  isError.value = false;
  try {
    message.value = await auth.forgotPassword({ email: form.email.trim() });
  } catch (error: unknown) {
    isError.value = true;
    message.value = error instanceof Error ? error.message : "Failed to process request";
  }
};
</script>

<style lang="scss" scoped></style>
