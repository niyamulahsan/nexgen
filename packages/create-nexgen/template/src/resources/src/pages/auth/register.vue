<template>
  <div class="container position-absolute start-50 top-50 translate-middle">
    <div class="auth col-12 col-sm-9 col-md-7 col-lg-5 col-xl-4 mx-auto py-5">
      <div class="card card-body border-0">
        <div class="d-block mb-2">
          <h3 class="m-0 text-uppercase text-center fw-semibold">nexgen</h3>
        </div>
        <h4 class="text-center">Create Account</h4>
        <p
          v-if="message"
          class="text-center alert py-1 mt-2"
          :class="isError ? 'alert-danger text-danger' : 'alert-success text-success'">
          {{ message }}
        </p>
        <form @submit.prevent="onSubmit">
          <div class="mb-4">
            <Input
              id="name"
              v-model="form.name"
              type="text"
              label="name"
              placeholder="Enter your name..."
              :err="false"
              focus
              must />
          </div>
          <div class="mb-4">
            <Input
              id="email"
              v-model="form.email"
              type="email"
              label="email"
              placeholder="Enter your email..."
              :err="false"
              must />
          </div>
          <div class="mb-4">
            <InputPasswordToggle
              id="password"
              v-model="form.password"
              label="password"
              placeholder="Create a password..."
              :err="false"
              must />
          </div>
          <div class="mb-4">
            <InputPasswordToggle
              id="password_confirmation"
              v-model="form.password_confirmation"
              label="confirm password"
              placeholder="Confirm your password..."
              :err="false"
              must />
          </div>
          <button type="submit" class="btn btn-primary w-100" :disabled="auth.processing">
            <span>Create Account</span>
            <i class="bi bi-person-plus ms-2"></i>
          </button>
        </form>
        <div class="text-center mt-3">
          <span class="text-muted">Already have an account?</span>
          <router-link to="/login" class="ms-1 text-decoration-none">Login</router-link>
        </div>
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

useHead({ title: "Register" });

const router = useRouter();
const auth = useAuthStore();

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

const form = reactive<RegisterForm>({
  name: "",
  email: "",
  password: "",
  password_confirmation: ""
});

const message = ref("");
const isError = ref(false);

const onSubmit = async () => {
  message.value = "";
  isError.value = false;

  if (form.password !== form.password_confirmation) {
    isError.value = true;
    message.value = "Password confirmation does not match";
    return;
  }

  try {
    const result = await auth.register({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      password_confirmation: form.password_confirmation
    });

    if (auth.isAuthenticated) {
      await router.push("/");
      return;
    }

    message.value = result || "Registration successful. Please verify your email.";
  } catch (error: unknown) {
    isError.value = true;
    message.value = error instanceof Error ? error.message : "Unable to register right now";
  }
};
</script>

<style lang="scss" scoped></style>
