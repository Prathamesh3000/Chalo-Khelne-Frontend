import { useState, useContext } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "react-toastify/dist/ReactToastify.css";
import { X, Eye, EyeOff, Loader2, LogIn, Shield, Zap, Send, Mail, Lock, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AuthPopup = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState("login");
  const navigate = useNavigate();

  const handleClose = onClose || (() => {});

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
      >
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500" />

        {/* Close button */}
        <button
          onClick={onClose || (() => navigate("/l/home"))}
          className="absolute top-5 right-5 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors z-[60] w-auto"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="p-8 md:p-10 overflow-y-auto max-h-[calc(90vh-6px)]">
          {activeTab === "login" ? (
            <LoginForm
              onClose={handleClose}
              switchToForgot={() => setActiveTab("forgotPassword")}
            />
          ) : (
            <ForgotPasswordForm
              switchToLogin={() => setActiveTab("login")}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const LoginForm = ({ onClose, switchToForgot }) => {
  const { login } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validationSchema = Yup.object({
    email: Yup.string()
      .email("Please enter a valid email")
      .required("Email is required"),
    password: Yup.string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
  });

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/login`,
          { email: values.email?.trim().toLowerCase(), password: values.password?.trim() }
        );
        toast.success("Login successful!");
        login(response.data);
        onClose();

        const userRole = response.data.user?.role?.toLowerCase() || "player";
        const dashboardMap = {
          superadmin: "/home",
          manager: "/mdashboard",
          clubadmin: "/club-dashboard",
          corporate_admin: "/corporate-dashboard",
          trainer: "/trainer-dashboard",
          player: "/phome",
        };
        window.location.replace(dashboardMap[userRole] || "/phome");
      } catch (error) {
        toast.error(error.response?.data?.message || "Invalid email or password");
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <img loading="lazy" src="/sportapp_logo.png" alt="Chalo Khelne" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-sm text-gray-400 mt-1">Sign in to your Chalo Khelne account</p>
      </div>

      <form className="space-y-5" onSubmit={formik.handleSubmit}>
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-gray-500 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                formik.touched.email && formik.errors.email ? "border-red-300" : "border-gray-200"
              }`}
              placeholder="you@example.com"
              {...formik.getFieldProps("email")}
            />
          </div>
          {formik.touched.email && formik.errors.email && (
            <p className="mt-1 text-xs text-red-500">{formik.errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-gray-500 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={`w-full pl-11 pr-11 py-3 bg-gray-50 border rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                formik.touched.password && formik.errors.password ? "border-red-300" : "border-gray-200"
              }`}
              placeholder="Enter your password"
              {...formik.getFieldProps("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors w-auto"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {formik.touched.password && formik.errors.password && (
            <p className="mt-1 text-xs text-red-500">{formik.errors.password}</p>
          )}
        </div>

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20" />
            <span className="text-xs text-gray-500">Remember me</span>
          </label>
          <button
            type="button"
            onClick={switchToForgot}
            className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors w-auto"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
        >
          {isLoading ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            <>Sign In <LogIn className="w-4 h-4" /></>
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-gray-400">
        Chalo Khelne — Sports Management Platform
      </p>
    </>
  );
};

const ForgotPasswordForm = ({ switchToLogin }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailFormik = useFormik({
    initialValues: { email: "" },
    validationSchema: Yup.object({
      email: Yup.string().email("Please enter a valid email").required("Email is required"),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/email/forgot-password/send-otp`, { email: values.email });
        setEmail(values.email);
        toast.success("OTP sent to your email");
        setStep(2);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to send OTP");
      } finally {
        setIsLoading(false);
      }
    },
  });

  const otpFormik = useFormik({
    initialValues: { otp: "" },
    validationSchema: Yup.object({
      otp: Yup.string().length(6, "OTP must be 6 digits").required("OTP is required"),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/email/forgot-password/verify-otp`, { email, otp: values.otp });
        toast.success("OTP verified successfully");
        setStep(3);
      } catch (error) {
        toast.error(error.response?.data?.message || "Invalid OTP");
      } finally {
        setIsLoading(false);
      }
    },
  });

  const passwordFormik = useFormik({
    initialValues: { newPassword: "", confirmPassword: "" },
    validationSchema: Yup.object({
      newPassword: Yup.string().min(6, "Must be at least 6 characters").required("Required"),
      confirmPassword: Yup.string().oneOf([Yup.ref("newPassword"), null], "Passwords don't match").required("Required"),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/email/forgot-password/reset`, { email: email.trim().toLowerCase(), newPassword: values.newPassword });
        toast.success("Password reset successful!");
        switchToLogin();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to reset password");
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Step indicator
  const StepDots = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? "w-6 bg-orange-500" : s < step ? "w-1.5 bg-emerald-400" : "w-1.5 bg-gray-200"}`} />
      ))}
    </div>
  );

  const inputClass = "w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all";

  return (
    <>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
        <p className="text-sm text-gray-400 mt-1">
          {step === 1 ? "Enter your email to receive a verification code" : step === 2 ? `Enter the 6-digit code sent to ${email}` : "Set your new password"}
        </p>
      </div>

      <StepDots />

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={emailFormik.handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" className={inputClass} placeholder="you@example.com" {...emailFormik.getFieldProps("email")} />
              </div>
              {emailFormik.touched.email && emailFormik.errors.email && <p className="mt-1 text-xs text-red-500">{emailFormik.errors.email}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <>Send OTP <Send className="w-4 h-4" /></>}
            </button>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={otpFormik.handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Verification Code</label>
              <div className="relative">
                <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" className={inputClass} placeholder="Enter 6-digit code" maxLength={6} {...otpFormik.getFieldProps("otp")} />
              </div>
              {otpFormik.touched.otp && otpFormik.errors.otp && <p className="mt-1 text-xs text-red-500">{otpFormik.errors.otp}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <>Verify Code <Shield className="w-4 h-4" /></>}
            </button>
          </motion.form>
        )}

        {step === 3 && (
          <motion.form key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={passwordFormik.handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="password" className={inputClass} placeholder="At least 6 characters" {...passwordFormik.getFieldProps("newPassword")} />
              </div>
              {passwordFormik.touched.newPassword && passwordFormik.errors.newPassword && <p className="mt-1 text-xs text-red-500">{passwordFormik.errors.newPassword}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="password" className={inputClass} placeholder="Repeat your password" {...passwordFormik.getFieldProps("confirmPassword")} />
              </div>
              {passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{passwordFormik.errors.confirmPassword}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <>Reset Password <Lock className="w-4 h-4" /></>}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mt-6 text-center">
        <button onClick={switchToLogin} className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center gap-1.5 mx-auto w-auto">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </button>
      </div>
    </>
  );
};

// Standalone page wrapper
const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
      <AuthPopup />
    </div>
  );
};

export default LoginPage;
export { AuthPopup };
