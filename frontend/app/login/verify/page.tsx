"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const email = searchParams.get("email") || "";
  const maskedEmail = searchParams.get("masked") || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect if no email param
  useEffect(() => {
    if (!email) {
      router.replace("/login");
    }
  }, [email, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await axios.post("/api/auth/verify-code", { email, code });
      login(res.data.token, res.data.user);
      router.push("/");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data;
        let msg = data.message || "Verification failed";
        if (data.attemptsRemaining !== undefined) {
          msg += ` (${data.attemptsRemaining} attempts remaining)`;
        }
        setError(msg);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setSuccess("");

    try {
      await axios.post("/api/auth/resend-code", { email });
      setSuccess("A new verification code has been sent to your email.");
      setResendCooldown(60);
      setCode("");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        setError(err.response.data.message || "Failed to resend code");
      } else {
        setError("Failed to resend code. Please try again.");
      }
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex justify-center mb-8">
        <img
          src="/HPSI_LOGO.png"
          alt="HPSI - High Performance Sport Institute"
          className="h-20"
        />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
        Verify Your Identity
      </h1>
      <p className="text-gray-500 text-center mb-8">
        We sent a verification code to{" "}
        <span className="font-medium text-gray-700">{maskedEmail}</span>
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Verification Code
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
            placeholder="Enter 6-digit code"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition text-center text-2xl tracking-widest"
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition"
        >
          {resendCooldown > 0
            ? `Resend code in ${resendCooldown}s`
            : "Resend Code"}
        </button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex h-screen">
      {/* Left Panel - Verify Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 bg-white">
        <Suspense
          fallback={
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          }
        >
          <VerifyForm />
        </Suspense>
      </div>

      {/* Right Panel - Branding */}
      <div className="hidden lg:flex w-1/2 bg-gray-800 flex-col justify-center items-center text-white px-12">
        <h2 className="text-4xl font-bold mb-4 text-center">
          HPSI Nutritionist Web Portal
        </h2>
        <p className="text-gray-300 text-lg text-center">
          Athlete and Supplement Support
        </p>
      </div>
    </div>
  );
}
