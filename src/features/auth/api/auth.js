import { api, USE_MOCK } from "../../../shared/api";
import * as mocks from "./mocks";

// The three demo emails that the mock recognises. Anything else falls through
// to the real backend even when USE_MOCK is on — so a teammate can demo with
// player@demo.com AND sign in with their real credentials in the same build.
const DEMO_EMAILS = new Set(["player@demo.com", "manager@demo.com", "admin@demo.com"]);

export async function login({ email, password }) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (USE_MOCK && DEMO_EMAILS.has(normalizedEmail)) {
    return mocks.mockLogin({ email: normalizedEmail, password });
  }
  const { data } = await api.post("/login", {
    email: normalizedEmail,
    password: password?.trim(),
  });
  return data;
}

// register() removed — web is admin-only. Players register on mobile; admin
// roles are created by SuperAdmin via /create-club-admin.

export async function sendForgotPasswordOtp({ email }) {
  if (USE_MOCK) return mocks.mockSendOtp();
  const { data } = await api.post("/email/forgot-password/send-otp", { email });
  return data;
}

export async function verifyForgotPasswordOtp({ email, otp }) {
  if (USE_MOCK) return mocks.mockVerifyOtp();
  const { data } = await api.post("/email/forgot-password/verify-otp", { email, otp });
  return data;
}

export async function resetPassword({ email, newPassword }) {
  if (USE_MOCK) return mocks.mockResetPassword();
  const { data } = await api.post("/email/forgot-password/reset", {
    email: email?.trim().toLowerCase(),
    newPassword,
  });
  return data;
}
