<template>
  <div class="container position-absolute start-50 top-50 translate-middle">
    <div class="auth col-12 col-sm-9 col-md-7 col-lg-5 col-xl-4 mx-auto py-5">
      <div class="card card-body border-0">
        <div class="d-block mb-2">
          <h3 class="m-0 text-uppercase text-center fw-semibold">nexgen</h3>
        </div>
        <h4 class="text-center">Reset Password</h4>
        <p
          v-if="message"
          class="text-center alert py-1 mt-2"
          :class="isError ? 'alert-danger text-danger' : 'alert-success text-success'">
          {{ message }}
        </p>
        <form
          id="formAuthentication"
          :class="{ 'pe-none opacity-50': !isLinkValid }"
          @submit.prevent="onSubmit">
          <div class="mb-4">
            <Input
              id="password"
              v-model="form.password"
              type="password"
              label="new password"
              placeholder="Enter new password..."
              :err="false"
              focus
              must />
          </div>
          <div class="mb-4">
            <Input
              id="password_confirmation"
              v-model="form.password_confirmation"
              type="password"
              label="confirm password"
              placeholder="Confirm new password..."
              :err="false"
              must />
          </div>
          <Button
            type="submit"
            label="Reset Password"
            class="btn btn-primary d-grid w-100"
            icon="bi bi-key ms-2"
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
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@vueuse/head";
import Input from "../../components/Input.vue";
import Button from "../../components/Button.vue";
import { useAuthStore } from "@/stores/auth";

useHead({ title: "Reset Password" });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

interface ResetPasswordForm {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

const form = reactive<ResetPasswordForm>({
  email: String(route.query.email || ""),
  token: String(route.query.token || ""),
  password: "",
  password_confirmation: ""
});

const isLinkValid = !!(form.token && form.email);
const message = ref(
  isLinkValid ? "Set your new password" : "Invalid reset link. Please request a new one."
);
const isError = ref(!isLinkValid);

const onSubmit = async () => {
  if (!isLinkValid) return;

  message.value = "";
  isError.value = false;

  if (form.password !== form.password_confirmation) {
    isError.value = true;
    message.value = "Password confirmation does not match";
    return;
  }

  try {
    message.value = await auth.resetPassword({
      email: form.email.trim(),
      token: form.token.trim(),
      password: form.password,
      password_confirmation: form.password_confirmation
    });
    await router.push("/login");
  } catch (error: unknown) {
    isError.value = true;
    message.value = error instanceof Error ? error.message : "Failed to reset password";
  }
};
</script>

<style lang="scss" scoped></style>
