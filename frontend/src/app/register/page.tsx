"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ByteVipersLogo } from "@/components/ByteVipersLogo";
import { Lock, User, Mail, AlertCircle, ArrowRight, Loader2, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, login } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    gender: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.gender) {
      setError("Please select your gender (Male or Female).");
      return;
    }

    setLoading(true);

    try {
      await register({
        full_name: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        gender: formData.gender,
      });

      // Automatically log user in after registration
      await login({
        username_or_email: formData.username,
        password: formData.password,
      });

      // Direct to verification application page
      router.push("/verify-student");
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 bg-[#050608] cyber-grid">
      <div className="w-full max-w-md p-8 sm:p-9 rounded-2xl bg-[#10151D] border border-[#222B3B] shadow-[0_0_40px_rgba(0,0,0,0.8)] relative">
        {/* Subtle top accent bar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#168BFF] to-transparent rounded-full" />

        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <ByteVipersLogo size={52} />
          </div>
          <h2 className="text-2xl font-extrabold text-[#F5F7FA] tracking-tight">Student Enrollment</h2>
          <p className="mt-1.5 text-xs text-[#9AA6B5]">Join ByteVipers Arena to conquer algorithmic Python</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30">
            <span>Verified Student Access</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
              Full Legal Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)] transition-all"
              />
              <User className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
              Arena Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="viper_jane"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)] transition-all"
              />
              <span className="text-[#5F6B7C] absolute left-3.5 top-2.5 font-mono text-sm">@</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
              Gender <span className="text-red-400">*</span>
              <span className="ml-1 text-[10px] text-[#5F6B7C] lowercase font-normal">(routes to designated coordinator)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-semibold ${
                  formData.gender === "Male"
                    ? "bg-[#168BFF]/15 border-[#168BFF] text-[#36C5FF] shadow-[0_0_12px_rgba(22,139,255,0.2)]"
                    : "bg-[#0B0E14] border-[#1C2330] text-[#9AA6B5] hover:border-[#222B3B]"
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  required
                  checked={formData.gender === "Male"}
                  onChange={() => setFormData({ ...formData, gender: "Male" })}
                  className="sr-only"
                />
                <span>Male</span>
              </label>

              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-semibold ${
                  formData.gender === "Female"
                    ? "bg-[#168BFF]/15 border-[#168BFF] text-[#36C5FF] shadow-[0_0_12px_rgba(22,139,255,0.2)]"
                    : "bg-[#0B0E14] border-[#1C2330] text-[#9AA6B5] hover:border-[#222B3B]"
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  required
                  checked={formData.gender === "Female"}
                  onChange={() => setFormData({ ...formData, gender: "Female" })}
                  className="sr-only"
                />
                <span>Female</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@university.edu"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)] transition-all"
              />
              <Mail className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
              Password (min. 6 chars)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)] transition-all"
              />
              <Lock className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#161D28]/80 border border-[#1C2330] text-[11px] text-[#9AA6B5] leading-relaxed">
            <span className="text-[#FFD978] font-semibold">Note:</span> After registration, you will complete student verification to unlock the protected problem arena.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl cyber-btn-blue text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(22,139,255,0.3)]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                <span>Create Account &amp; Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#1C2330] text-center text-xs text-[#9AA6B5]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#36C5FF] hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
