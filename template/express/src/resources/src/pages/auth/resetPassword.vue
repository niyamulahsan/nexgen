<!-- ./src/resources/src/pages/auth/resetPassword.vue -->

<template>
  <div class="container position-absolute start-50 top-50 translate-middle">
    <div class="auth col-12 col-sm-9 col-md-7 col-lg-5 col-xl-4 mx-auto py-5">
      <div class="card card-body border-0">
        <div class="d-block mb-2 text-center">
          <img src="@/assets/images/logo.png" alt="nexwire" style="max-height: 60px;">
        </div>
        <h4 class="text-center">Reset Password</h4>
        <p v-if="message" class="text-center alert py-1 mt-2" :class="isError ? 'alert-danger text-danger' : 'alert-success text-success'">
          {{ message }}
        </p>
        <form id="formAuthentication" :class="{ 'pe-none opacity-50': !isLinkValid }" @submit.prevent="onSubmit">
          <div class="mb-4">
            <input-password-toggle
              id="password"
              v-model="form.data.password"
              label="new password"
              placeholder="Enter your password..."
              :err="form.errors.password"
              must
            />
          </div>
          <div class="mb-4">
            <input-password-toggle
              id="password_confirmation"
              v-model="form.data.password_confirmation"
              label="confirm password"
              placeholder="Confirm new password..."
              :err="form.errors.password_confirmation"
              must
            />
          </div>
          <Button type="submit" label="Reset Password" class="btn btn-primary w-100" icon="bi bi-key ms-2" :disabled="processing" />
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
import { useHead } from "@unhead/vue";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/components/Button.vue";
import InputPasswordToggle from "@/components/InputPasswordToggle.vue";
import { useGum } from "@/plugins/gum";
import { type ResetPayload, useAuthStore } from "@/stores/auth";

useHead({ title: "Reset Password" });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const email = String(route.query.email || "");
const token = String(route.query.token || "");

const gum = useGum({
  email,
  token,
  password: "",
  password_confirmation: ""
});

const form = gum.form;
const processing = form.processing;
const isLinkValid = !!(token && email);
const message = ref(isLinkValid ? "Set your new password" : "Invalid reset link. Please request a new one.");
const isError = ref(!isLinkValid);

const onSubmit = async () => {
  if (!isLinkValid) return;

  message.value = "";
  isError.value = false;

  if (form.data.password !== form.data.password_confirmation) {
    isError.value = true;
    message.value = "Password confirmation does not match";
    return;
  }

  await form.postWith({
    fetcher: (body) => auth.resetPassword(body as ResetPayload),
    transform: (data) => ({
      email: String(data.email || "").trim(),
      token: String(data.token || "").trim(),
      password: data.password,
      password_confirmation: data.password_confirmation
    }),
    onSuccess: (res) => {
      isError.value = false;
      message.value = String(res.data || "Password reset successfully");
      void router.push("/login");
    },
    onError: (_errors, error) => {
      isError.value = true;
      message.value = error instanceof Error ? error.message : "Failed to reset password";
    }
  });
};
</script>

<style lang="scss" scoped></style>
