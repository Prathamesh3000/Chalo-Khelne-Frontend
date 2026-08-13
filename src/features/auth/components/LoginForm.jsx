import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { Eye, EyeOff, LogIn, Mail, Lock, AlertTriangle } from "lucide-react";
import { Button, Input } from "../../../shared/ui";
import { useAuth } from "../context/AuthContext";
import { login as loginApi } from "../api/auth";

// §4.3 — this local map was missing club_admin, vendor and every agency role,
// so those users fell through to "/phome" and a club admin landed on the PLAYER
// home right after signing in. Now shared with App.jsx.
import { homeForRole } from "../roleHome";

export function LoginForm({ onSuccess, onForgotPassword }) {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Sticky banner for suspension/rejection — toast is too transient for the
  // user to read the reason. Cleared on next submit.
  const [blockedBanner, setBlockedBanner] = useState(null);

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: Yup.object({
      email: Yup.string().email("Please enter a valid email").required("Email is required"),
      password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
    }),
    onSubmit: async (values) => {
      setLoading(true);
      setBlockedBanner(null);
      try {
        const data = await loginApi(values);
        const user = login(data);
        toast.success("Welcome back!");
        const path = homeForRole(user.role);
        onSuccess?.(path);
      } catch (e) {
        const payload = e.response?.data || {};
        if (payload.code === "ACCOUNT_SUSPENDED") {
          setBlockedBanner({
            kind: "suspended",
            title: "Your account has been suspended",
            reason: payload.reason || "Contact support for more information.",
          });
        } else if (payload.code === "ACCOUNT_REJECTED") {
          setBlockedBanner({
            kind: "rejected",
            title: "Your account has been rejected",
            reason: payload.reason || "Contact support for more information.",
          });
        } else {
          toast.error(payload.message || "Invalid email or password");
        }
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-5">
      {blockedBanner && (
        <div
          className={`rounded-xl border p-4 flex items-start gap-3 ${
            blockedBanner.kind === "suspended"
              ? "bg-amber-50 border-amber-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              blockedBanner.kind === "suspended" ? "text-amber-600" : "text-red-600"
            }`}
          />
          <div className="min-w-0">
            <p
              className={`text-sm font-bold ${
                blockedBanner.kind === "suspended" ? "text-amber-800" : "text-red-800"
              }`}
            >
              {blockedBanner.title}
            </p>
            <p
              className={`text-xs mt-1 ${
                blockedBanner.kind === "suspended" ? "text-amber-700" : "text-red-700"
              }`}
            >
              Reason: {blockedBanner.reason}
            </p>
          </div>
        </div>
      )}

      <Input
        name="email"
        type="email"
        label="Email Address"
        placeholder="you@example.com"
        autoComplete="email"
        leftIcon={<Mail className="w-4 h-4" />}
        error={formik.touched.email && formik.errors.email}
        {...formik.getFieldProps("email")}
      />
      <Input
        name="password"
        type={showPassword ? "text" : "password"}
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        leftIcon={<Lock className="w-4 h-4" />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition w-auto"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        error={formik.touched.password && formik.errors.password}
        {...formik.getFieldProps("password")}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20" />
          <span className="text-xs text-gray-500">Remember me</span>
        </label>
        {onForgotPassword && (
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition w-auto"
          >
            Forgot password?
          </button>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={loading}
        loading={loading}
      >
        Sign In <LogIn className="w-4 h-4" />
      </Button>

      {import.meta.env.VITE_USE_MOCK === "true" && (
        <p className="text-[11px] text-center text-gray-400 leading-relaxed">
          <span className="font-semibold text-amber-600">Mock mode</span> — try{" "}
          <code className="px-1 bg-gray-100 rounded">player@demo.com</code>,{" "}
          <code className="px-1 bg-gray-100 rounded">manager@demo.com</code>, or{" "}
          <code className="px-1 bg-gray-100 rounded">admin@demo.com</code>
        </p>
      )}
    </form>
  );
}

export default LoginForm;
