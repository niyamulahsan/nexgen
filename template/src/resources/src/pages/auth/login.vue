<template>
  <div class="container position-absolute start-50 top-50 translate-middle">
    <div class="auth col-12 col-sm-9 col-md-7 col-lg-5 col-xl-4 mx-auto py-5">
      <div class="card card-body border-0">
        <div class="d-block mb-2">
          <h3 class="m-0 text-uppercase text-center fw-semibold">nexgen</h3>
        </div>
        <p v-if="errorMessage" class="text-center alert alert-danger text-danger py-1 mt-2">
          {{ errorMessage }}
        </p>
        <form @submit.prevent="onSubmit">
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
          <div class="mb-4">
            <input-password-toggle
              id="password"
              v-model="form.password"
              label="password"
              placeholder="Enter your password..."
              :err="false"
              must />
          </div>
          <div class="mb-4 d-flex align-items-center justify-content-between">
            <Checkbox id="remember-me" v-model="form.remember" label="Remember me" />
            <router-link to="/forget-password" class="text-decoration-none mb-1">Forget Password?</router-link>
          </div>
          <button type="submit" class="btn btn-primary w-100" :disabled="auth.processing">
            <span>Login</span>
            <i class="bi bi-box-arrow-in-right ms-2"></i>
          </button>
          <div class="text-center mt-3">
            <span class="text-muted">Don't have an account?</span>
            <router-link to="/register" class="ms-1 text-decoration-none">Register</router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useHead } from "@vueuse/head";
import { useAuthStore } from "@/stores/auth";

import Input from "@/components/Input.vue";
import InputPasswordToggle from "@/components/InputPasswordToggle.vue";
import Checkbox from "@/components/Checkbox.vue";

useHead({ title: "Login" });

const router = useRouter();
const auth = useAuthStore();
const errorMessage = ref("");

interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

const form = reactive<LoginForm>({
  email: "",
  password: "",
  remember: false
});

const onSubmit = async () => {
  errorMessage.value = "";
  try {
    await auth.login({
      email: form.email.trim(),
      password: form.password,
      remember: form.remember
    });
    await router.push("/");
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to login right now";
  }
};
</script>

<style lang="scss" scoped></style>
