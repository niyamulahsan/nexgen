import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";
import { clearUser, setUser, type AuthUser } from "@/composables/useAuth";

type LoginPayload = { email: string; password: string; remember?: boolean; };
type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};
type VerifyEmailPayload = { email: string; token: string; };
type ForgotPayload = { email: string; };
type ResetPayload = {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
};

type ApiResponse<T> = { message: string; data?: T; };
type AuthData = { user: AuthUser; };

async function request<T>(method: "GET" | "POST", path: string, payload?: unknown): Promise<ApiResponse<T>> {
  try {
    const response = await axios.request<ApiResponse<T>>({
      method,
      url: `/api/auth${path}`,
      data: payload
    });

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(String(error.response?.data?.message || error.message || "Request failed"));
    }
    throw new Error("Request failed");
  }
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<AuthUser | null>(null);
  const isAuthenticated = ref(false);
  const processing = ref(false);
  const initialized = ref(false);

  const syncUser = (value: AuthUser | null) => {
    user.value = value;
    isAuthenticated.value = !!value;
    if (value) setUser(value);
    else clearUser();
  };

  const bootstrap = async () => {
    if (initialized.value) return;

    try {
      const data = await request<AuthUser>("GET", "/me");
      syncUser((data?.data || null) as AuthUser | null);
    } catch {
      syncUser(null);
    } finally {
      initialized.value = true;
    }
  };

  const login = async (payload: LoginPayload) => {
    processing.value = true;
    try {
      const data = await request<AuthData>("POST", "/login", payload);
      syncUser((data?.data?.user || null) as AuthUser | null);
      initialized.value = true;
      return data.message || "Login successful";
    } finally {
      processing.value = false;
    }
  };

  const register = async (payload: RegisterPayload) => {
    processing.value = true;
    try {
      const data = await request<AuthData>("POST", "/register", payload);
      const createdUser = (data?.data?.user || null) as AuthUser | null;
      if (createdUser) {
        syncUser(createdUser);
        initialized.value = true;
      } else {
        syncUser(null);
      }
      return data.message || "Registration successful";
    } finally {
      processing.value = false;
    }
  };

  const verifyEmail = async (payload: VerifyEmailPayload) => {
    processing.value = true;
    try {
      const data = await request<unknown>("POST", "/verify-email", payload);
      return data.message || "Email verified successfully";
    } finally {
      processing.value = false;
    }
  };

  const forgotPassword = async (payload: ForgotPayload) => {
    processing.value = true;
    try {
      const data = await request<unknown>("POST", "/forgot-password", payload);
      return data.message || "If this email exists, a reset link has been sent";
    } finally {
      processing.value = false;
    }
  };

  const resetPassword = async (payload: ResetPayload) => {
    processing.value = true;
    try {
      const data = await request<unknown>("POST", "/reset-password", payload);
      return data.message || "Password reset successfully";
    } finally {
      processing.value = false;
    }
  };

  const logout = async () => {
    processing.value = true;
    try {
      await request<unknown>("POST", "/logout");
    } finally {
      syncUser(null);
      processing.value = false;
      initialized.value = true;
    }
  };

  return {
    user,
    isAuthenticated,
    processing,
    initialized,
    bootstrap,
    register,
    login,
    forgotPassword,
    resetPassword,
    verifyEmail,
    logout
  };
});
