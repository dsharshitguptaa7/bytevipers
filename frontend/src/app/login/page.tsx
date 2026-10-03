"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ByteVipersLogo } from "@/components/ByteVipersLogo";
import { Lock, User, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login({ username_or_email: identifier, password });
      if (user.role === "teacher") {
        router.push("/teacher");
      } else if (user.role === "coordinator") {
        router.push("/coordinator");
      } else if (user.role === "student") {
        const vStatus = (user.verification_status || "").toLowerCase();
        if (vStatus === "approved") {
          router.push("/dashboard");
        } else {
          router.push("/verify-student");
        }
      } else {
        router.push("/problems");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 bg-[#050608] cyber-grid">
      <div className="w-full max-w-md p-8 sm:p-9 rounded-2xl bg-[#10151D] border border-[#222B3B] shadow-[0_0_40px_rgba(0,0,0,0.8)] relative">
        {/* Subtle top accent bar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#F5BD45] to-transparent rounded-full" />

        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <ByteVipersLogo size={52} />
          </div>
          <h2 className="text-2xl font-extrabold text-[#F5F7FA] tracking-tight">Arena Authentication</h2>
          <p className="mt-1.5 text-xs text-[#9AA6B5]">
            Sign in to access student practice, coordinator verification, or instructor tools
          </p>

          {/* Role Pills Guidance */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30">
              Student
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#36C5FF]/10 text-[#36C5FF] border border-[#36C5FF]/30">
              Coordinator
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30">
              Teacher / Admin
            </span>
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
              Username or Email
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="username or user@bytevipers.edu"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)] transition-all"
              />
              <User className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)] transition-all"
              />
              <Lock className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl cyber-btn-gold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(245,189,69,0.2)]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#050608]" /> : (
              <>
                <span>Sign In to Arena</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#1C2330] text-center text-xs text-[#9AA6B5]">
          New student?{" "}
          <Link href="/register" className="font-semibold text-[#36C5FF] hover:underline">
            Register student account
          </Link>
        </div>
      </div>
    </div>
  );
}
