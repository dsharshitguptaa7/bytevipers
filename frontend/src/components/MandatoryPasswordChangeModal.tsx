"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { ShieldAlert, Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function MandatoryPasswordChangeModal() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Only display if user is logged in and must_change_password is true
  if (!user || !user.must_change_password) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("New password must be different from current/temporary password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      localStorage.setItem("bytevipers_token", res.access_token);
      localStorage.setItem("bytevipers_refresh_token", res.refresh_token);

      setSuccess(true);
      setTimeout(async () => {
        await refreshUser();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please verify current credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl cyber-card border border-[#F5BD45]/40 shadow-2xl p-6 glow-gold animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 pb-4 border-b border-[#1C2330]">
          <div className="w-10 h-10 rounded-xl bg-[#F5BD45]/10 border border-[#F5BD45]/30 flex items-center justify-center text-[#FFD978]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#F5F7FA]">Password Rotation Required</h3>
            <p className="text-xs text-[#9AA6B5]">Security compliance verification</p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-[#168BFF]/10 border border-[#168BFF]/20 text-xs text-[#36C5FF] flex items-start gap-2.5">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            You are logged in with an administrator-issued temporary credential. You must choose a permanent password to continue using ByteVipers.
          </span>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto" />
            <p className="text-sm font-bold">Password Updated Successfully!</p>
            <p className="text-xs text-[#9AA6B5]">Refreshing your secure session...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1">
                Current / Temporary Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current or temporary password"
                className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1">
                New Permanent Password (min 8 characters) *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Choose a strong permanent password"
                className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl cyber-btn-gold text-xs font-bold glow-gold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save New Password & Continue"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
