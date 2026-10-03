"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { User, Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      await api.updateMe({
        full_name: fullName || undefined,
        password: password || undefined,
      });
      await refreshUser();
      setSuccess("Profile updated successfully.");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = user?.role === "teacher";
  const isCoordinator = user?.role === "coordinator";

  return (
    <div className="flex-1 max-w-2xl mx-auto px-4 py-12 w-full">
      <div className={`cyber-card p-8 rounded-2xl shadow-2xl relative overflow-hidden ${isTeacher ? "glow-gold" : "glow-blue"}`}>
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
            isTeacher
              ? "from-transparent via-[#F5BD45] to-transparent"
              : "from-transparent via-[#168BFF] to-transparent"
          }`}
        />

        <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Account Settings</h1>
        <p className="text-xs text-[#9AA6B5] mt-1">Manage your profile credentials and security parameters.</p>

        {success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#5F6B7C]">Username</span>
            <span className="font-mono text-[#F5F7FA]">@{user?.username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#5F6B7C]">Email</span>
            <span className="text-[#F5F7FA] font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#5F6B7C]">Platform Role</span>
            <span
              className={`font-bold uppercase text-[11px] px-2 py-0.5 rounded border ${
                isTeacher
                  ? "bg-[#F5BD45]/10 text-[#FFD978] border-[#F5BD45]/30"
                  : isCoordinator
                  ? "bg-[#168BFF]/10 text-[#36C5FF] border-[#168BFF]/30"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {isTeacher ? "Super Admin (Teacher)" : user?.role}
            </span>
          </div>
          {user?.role === "student" && (
            <div className="flex justify-between items-center">
              <span className="text-[#5F6B7C]">Verification Status</span>
              <span className="font-bold text-[#FFD978] bg-[#F5BD45]/10 border border-[#F5BD45]/30 px-2 py-0.5 rounded text-[11px]">
                {user?.verification_status || "PENDING"}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] focus:outline-none focus:border-[#168BFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">New Password (leave blank to keep current)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              isTeacher ? "cyber-btn-gold glow-gold" : "cyber-btn-blue glow-blue"
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Profile Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
