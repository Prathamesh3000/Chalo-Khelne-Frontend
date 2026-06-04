import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock, Mail, Send, Shield, Zap } from "lucide-react";
import { Button, Input } from "../../../shared/ui";
import { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetPassword } from "../api/auth";

export function ForgotPasswordForm({ onBack }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const emailForm = useFormik({
    initialValues: { email: "" },
    validationSchema: Yup.object({
      email: Yup.string().email("Please enter a valid email").required("Email is required"),
    }),
    onSubmit: async (v) => {
      setLoading(true);
      try {
        await sendForgotPasswordOtp({ email: v.email });
        setEmail(v.email);
        toast.success("OTP sent to your email");
        setStep(2);
      } catch (e) {
        toast.error(e.response?.data?.message || "Failed to send OTP");
      } finally { setLoading(false); }
    },
  });

  const otpForm = useFormik({
    initialValues: { otp: "" },
    validationSchema: Yup.object({
      otp: Yup.string().length(6, "OTP must be 6 digits").required("OTP is required"),
    }),
    onSubmit: async (v) => {
      setLoading(true);
      try {
        await verifyForgotPasswordOtp({ email, otp: v.otp });
        toast.success("OTP verified");
        setStep(3);
      } catch (e) {
        toast.error(e.response?.data?.message || "Invalid OTP");
      } finally { setLoading(false); }
    },
  });

  const passwordForm = useFormik({
    initialValues: { newPassword: "", confirmPassword: "" },
    validationSchema: Yup.object({
      newPassword: Yup.string().min(6, "Must be at least 6 characters").required("Required"),
      confirmPassword: Yup.string().oneOf([Yup.ref("newPassword"), null], "Passwords don't match").required("Required"),
    }),
    onSubmit: async (v) => {
      setLoading(true);
      try {
        await resetPassword({ email, newPassword: v.newPassword });
        toast.success("Password reset successful!");
        onBack?.();
      } catch (e) {
        toast.error(e.response?.data?.message || "Failed to reset password");
      } finally { setLoading(false); }
    },
  });

  const StepDots = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            s === step ? "w-6 bg-orange-500" : s < step ? "w-1.5 bg-emerald-500" : "w-1.5 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );

  return (
    <>
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
        <p className="text-sm text-gray-400 mt-1">
          {step === 1 && "Enter your email to receive a verification code"}
          {step === 2 && `Enter the 6-digit code sent to ${email}`}
          {step === 3 && "Set your new password"}
        </p>
      </div>
      <StepDots />

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={emailForm.handleSubmit} className="space-y-5">
            <Input
              name="email"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={emailForm.touched.email && emailForm.errors.email}
              {...emailForm.getFieldProps("email")}
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
              Send OTP <Send className="w-4 h-4" />
            </Button>
          </motion.form>
        )}
        {step === 2 && (
          <motion.form key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={otpForm.handleSubmit} className="space-y-5">
            <Input
              name="otp"
              label="Verification Code"
              placeholder="Enter 6-digit code"
              maxLength={6}
              leftIcon={<Zap className="w-4 h-4" />}
              error={otpForm.touched.otp && otpForm.errors.otp}
              {...otpForm.getFieldProps("otp")}
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
              Verify Code <Shield className="w-4 h-4" />
            </Button>
          </motion.form>
        )}
        {step === 3 && (
          <motion.form key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={passwordForm.handleSubmit} className="space-y-5">
            <Input
              name="newPassword"
              type="password"
              label="New Password"
              placeholder="At least 6 characters"
              leftIcon={<Lock className="w-4 h-4" />}
              error={passwordForm.touched.newPassword && passwordForm.errors.newPassword}
              {...passwordForm.getFieldProps("newPassword")}
            />
            <Input
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="Repeat your password"
              leftIcon={<Shield className="w-4 h-4" />}
              error={passwordForm.touched.confirmPassword && passwordForm.errors.confirmPassword}
              {...passwordForm.getFieldProps("confirmPassword")}
            />
            <Button type="submit" variant="secondary" size="lg" className="w-full" loading={loading}>
              Reset Password <Lock className="w-4 h-4" />
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mt-6 text-center">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition flex items-center justify-center gap-1.5 mx-auto w-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </button>
      </div>
    </>
  );
}

export default ForgotPasswordForm;
