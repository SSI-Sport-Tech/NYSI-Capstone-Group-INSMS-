"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/api/auth/login", { email, password });

      // If backend returned a token directly (SKIP_2FA mode), log in immediately
      if (res.data.token) {
        login(res.data.token, res.data.user);
        router.push("/");
        return;
      }

      // Otherwise, proceed to 2FA verification
      const maskedEmail = res.data.email;
      router.push(
        `/login/verify?email=${encodeURIComponent(email)}&masked=${encodeURIComponent(maskedEmail)}`
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        setError(err.response.data.message || "Login failed");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img
              src="/HPSI_LOGO.png"
              alt="HPSI - High Performance Sport Institute"
              className="h-20"
            />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
            Sign In
          </h1>
          <p className="text-gray-500 text-center mb-8">
            Enter your credentials to access your account
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Log In"}
            </button>
          </form>
        </div>
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
