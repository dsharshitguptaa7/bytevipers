"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Users, Shield, ShieldAlert, Key, Search, Loader2,
  AlertCircle, CheckCircle2, X, Copy, Check, Clock, AlertTriangle, Lock
} from "lucide-react";

const AVAILABLE_PERMISSIONS = [
  { name: "verification.review", label: "Review Student Verifications" },
  { name: "problems.create", label: "Create Problems" },
  { name: "problems.edit", label: "Edit Problems" },
  { name: "problems.publish", label: "Publish/Unpublish Problems" },
  { name: "assignments.create", label: "Create Assignments" },
  { name: "assignments.manage", label: "Manage Assignments" },
  { name: "classes.manage", label: "Manage Classes" },
  { name: "submissions.review", label: "Review Submissions" },
  { name: "users.manage", label: "Manage Users & Suspensions" },
  { name: "platform.configure", label: "Configure Platform & Delegate Perms" },
  { name: "audit_logs.view", label: "View Audit Logs" },
];

export default function TeacherUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [permUser, setPermUser] = useState<any | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [suspendUser, setSuspendUser] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // Password Recovery Assistance states
  const [recoveryTargetUser, setRecoveryTargetUser] = useState<any | null>(null);
  const [recoveryResult, setRecoveryResult] = useState<{
    temporary_password: string;
    expires_at: string;
    username: string;
    full_name: string;
  } | null>(null);
  const [recoveryCopied, setRecoveryCopied] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.listPlatformUsers({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load platform users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadUsers, 200);
    return () => clearTimeout(timer);
  }, [search, roleFilter]);

  const openPermModal = (targetUser: any) => {
    setPermUser(targetUser);
    setSelectedPerms(targetUser.permissions || []);
  };

  const handleSavePermissions = async () => {
    if (!permUser) return;
    setModalLoading(true);
    setError(null);
    try {
      await api.updateTeacherPermissions(permUser.id, selectedPerms);
      setPermUser(null);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to update permissions.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!suspendUser) return;
    setModalLoading(true);
    setError(null);
    try {
      const newSuspendState = !suspendUser.is_suspended;
      await api.setUserSuspension(suspendUser.id, newSuspendState, suspendReason);
      setSuspendUser(null);
      setSuspendReason("");
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to change user suspension state.");
    } finally {
      setModalLoading(false);
    }
  };

  const openRecoveryModal = (targetUser: any) => {
    setRecoveryTargetUser(targetUser);
  };

  const handleConfirmRecovery = async () => {
    if (!recoveryTargetUser) return;
    setModalLoading(true);
    setError(null);
    try {
      const res = await api.assistPasswordRecovery(recoveryTargetUser.id);
      setRecoveryResult({
        temporary_password: res.temporary_password,
        expires_at: res.expires_at,
        username: res.username,
        full_name: recoveryTargetUser.full_name,
      });
      setRecoveryTargetUser(null);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to issue temporary recovery credentials.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCopyCredential = async () => {
    if (!recoveryResult) return;
    try {
      await navigator.clipboard.writeText(recoveryResult.temporary_password);
      setRecoveryCopied(true);
      setTimeout(() => setRecoveryCopied(false), 2500);
    } catch {
      // clipboard fallback
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="pb-6 border-b border-[#1C2330]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 uppercase tracking-wider">
            Super Admin Governance
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Users & Delegated Permissions</h1>
        <p className="text-xs text-[#9AA6B5] mt-1">
          Govern platform user statuses, suspend accounts, and delegate administrative capabilities.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, username, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
          />
          <Search className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#F5BD45]"
          >
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="coordinator">Coordinator</option>
            <option value="teacher">Super Admin / Teacher</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="cyber-card rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 flex items-center justify-center text-[#9AA6B5]">
            <Loader2 className="w-6 h-6 animate-spin text-[#F5BD45] mr-2" />
            <span className="text-xs">Loading accounts...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0E14] text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                <tr>
                  <th className="py-3 px-6">User</th>
                  <th className="py-3 px-6">Role</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Permissions</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2330]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#161D28]/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-[#F5F7FA]">
                      {u.full_name}
                      <span className="text-[10px] text-[#5F6B7C] block font-mono">
                        @{u.username} • {u.email}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          u.role === "teacher"
                            ? "bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30"
                            : u.role === "coordinator"
                            ? "bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {u.role === "teacher" ? "Super Admin" : u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {u.is_suspended ? (
                        <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                          Suspended
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-[11px] text-[#9AA6B5]">
                      {u.role === "teacher" ? (
                        u.permissions?.length > 0 ? (
                          <span className="font-mono text-[#36C5FF]">{u.permissions.length} granted</span>
                        ) : (
                          <span className="italic text-[#5F6B7C]">Standard Teacher</span>
                        )
                      ) : (
                        <span className="text-[#5F6B7C]">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openRecoveryModal(u)}
                        disabled={
                          u.id === currentUser?.id ||
                          (u.role === "teacher" && !currentUser?.permissions?.includes("platform.superadmin"))
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-[#0B0E14] text-[#36C5FF] border border-[#168BFF]/30 hover:bg-[#168BFF]/20 font-semibold disabled:opacity-30 transition-all inline-flex items-center gap-1.5"
                        title={
                          u.id === currentUser?.id
                            ? "Cannot reset own password via admin tool"
                            : u.role === "teacher" && !currentUser?.permissions?.includes("platform.superadmin")
                            ? "Only Super Admins can assist Teacher accounts"
                            : "Issue temporary recovery credentials"
                        }
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Reset Password</span>
                      </button>

                      {u.role === "teacher" && (
                        <button
                          onClick={() => openPermModal(u)}
                          disabled={u.id === currentUser?.id}
                          className="px-3 py-1.5 rounded-lg bg-[#0B0E14] text-[#FFD978] border border-[#F5BD45]/30 hover:bg-[#F5BD45] hover:text-[#050608] font-semibold disabled:opacity-30 transition-all"
                          title={u.id === currentUser?.id ? "Cannot modify own permissions" : "Manage permissions"}
                        >
                          Permissions
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSuspendUser(u);
                          setSuspendReason(u.suspension_reason || "");
                        }}
                        disabled={u.id === currentUser?.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30 transition-all ${
                          u.is_suspended
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                        }`}
                      >
                        {u.is_suspended ? "Reactivate" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permissions Delegation Modal */}
      {permUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-2xl cyber-card border border-[#1C2330] shadow-2xl p-6 glow-gold">
            <div className="flex items-center justify-between pb-4 border-b border-[#1C2330]">
              <div>
                <h3 className="text-base font-bold text-[#F5F7FA]">
                  Permissions: {permUser.full_name}
                </h3>
                <p className="text-xs text-[#9AA6B5]">@{permUser.username}</p>
              </div>
              <button onClick={() => setPermUser(null)} className="text-[#5F6B7C] hover:text-[#F5F7FA]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-2">
              {AVAILABLE_PERMISSIONS.map((p) => {
                const checked = selectedPerms.includes(p.name);
                return (
                  <label
                    key={p.name}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs cursor-pointer hover:border-[#F5BD45]/40"
                  >
                    <div>
                      <p className="font-semibold text-[#F5F7FA]">{p.label}</p>
                      <p className="text-[10px] text-[#5F6B7C] font-mono">{p.name}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPerms([...selectedPerms, p.name]);
                        } else {
                          setSelectedPerms(selectedPerms.filter((item) => item !== p.name));
                        }
                      }}
                      className="rounded border-[#1C2330] text-[#F5BD45]"
                    />
                  </label>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-[#1C2330] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPermUser(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#9AA6B5] hover:text-[#F5F7FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={modalLoading}
                onClick={handleSavePermissions}
                className="cyber-btn-gold px-4 py-1.5 rounded-lg text-xs font-bold glow-gold flex items-center gap-1.5 disabled:opacity-50"
              >
                {modalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl cyber-card border border-[#1C2330] shadow-2xl p-6">
            <h3 className="text-base font-bold text-[#F5F7FA]">
              {suspendUser.is_suspended ? "Reactivate Account" : "Suspend Account"}
            </h3>
            <p className="text-xs text-[#9AA6B5] mt-1">
              Target: <span className="font-bold text-[#F5F7FA]">{suspendUser.full_name}</span> (@{suspendUser.username})
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1">
                Reason / Explanation *
              </label>
              <input
                type="text"
                required
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Required explanation for suspension log..."
                className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setSuspendUser(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#9AA6B5] hover:text-[#F5F7FA]"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleSuspend}
                disabled={modalLoading || !suspendReason.trim()}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                  suspendUser.is_suspended
                    ? "bg-emerald-500 text-[#050608]"
                    : "bg-red-500 text-white"
                }`}
              >
                {modalLoading ? "Saving..." : suspendUser.is_suspended ? "Confirm Reactivation" : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Recovery Confirmation Modal */}
      {recoveryTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl cyber-card border border-[#168BFF]/40 shadow-2xl p-6 glow-blue">
            <div className="flex items-center gap-3 pb-4 border-b border-[#1C2330]">
              <div className="w-10 h-10 rounded-xl bg-[#168BFF]/10 border border-[#168BFF]/30 flex items-center justify-center text-[#36C5FF]">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F7FA]">Admin Password Assistance</h3>
                <p className="text-xs text-[#9AA6B5]">Issue temporary recovery credentials</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-[#F5F7FA]">
                Target Account: <span className="font-bold text-[#36C5FF]">{recoveryTargetUser.full_name}</span> (@{recoveryTargetUser.username} • {recoveryTargetUser.email})
              </p>

              <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] space-y-2.5 text-xs text-[#9AA6B5]">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#F5BD45] shrink-0 mt-0.5" />
                  <span><strong className="text-[#F5F7FA]">Session Invalidation:</strong> All existing active logins and tokens will be revoked immediately.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#36C5FF] shrink-0 mt-0.5" />
                  <span><strong className="text-[#F5F7FA]">24h Expiration:</strong> The temporary password expires in 24 hours if unused.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong className="text-[#F5F7FA]">Mandatory Rotation:</strong> The user will be required to change their password upon their next login.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FFD978] shrink-0 mt-0.5" />
                  <span><strong className="text-[#F5F7FA]">One-Time Display:</strong> The temporary password will be shown once and is NOT stored in plaintext.</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRecoveryTargetUser(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#9AA6B5] hover:text-[#F5F7FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={modalLoading}
                onClick={handleConfirmRecovery}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#168BFF] text-white hover:bg-[#36C5FF] hover:text-[#050608] transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {modalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm & Generate Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-Time Credential Display Modal */}
      {recoveryResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl cyber-card border border-[#F5BD45]/50 shadow-2xl p-6 glow-gold">
            <div className="flex items-center gap-3 pb-4 border-b border-[#1C2330]">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F7FA]">Temporary Credential Issued</h3>
                <p className="text-xs text-[#9AA6B5]">One-time security delivery</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-[#9AA6B5]">
                  Temporary password for <span className="font-bold text-[#F5F7FA]">{recoveryResult.full_name}</span> (@{recoveryResult.username}):
                </p>

                {/* Monospace Credential Box */}
                <div className="mt-2 p-3.5 rounded-xl bg-[#0B0E14] border border-[#F5BD45]/40 flex items-center justify-between gap-3">
                  <span className="font-mono text-sm sm:text-base font-bold text-[#FFD978] tracking-wider select-all break-all">
                    {recoveryResult.temporary_password}
                  </span>
                  <button
                    onClick={handleCopyCredential}
                    className="px-3 py-1.5 rounded-lg bg-[#F5BD45]/20 hover:bg-[#F5BD45] text-[#FFD978] hover:text-[#050608] text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
                  >
                    {recoveryCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F5BD45]/10 border border-[#F5BD45]/20 text-xs text-[#FFD978] space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Important Security Notice</span>
                </p>
                <p className="text-[11px] text-[#9AA6B5]">
                  • This password will <strong className="text-white">never be shown again</strong>. It is hashed immediately using bcrypt.
                </p>
                <p className="text-[11px] text-[#9AA6B5]">
                  • Deliver this password directly to the user through a verified, secure communication channel.
                </p>
                <p className="text-[11px] text-[#9AA6B5]">
                  • The user will be required to change this temporary password immediately upon login.
                </p>
                <p className="text-[11px] text-[#9AA6B5]">
                  • Valid until: <span className="font-mono text-white">{new Date(recoveryResult.expires_at).toLocaleString()}</span> (24 hours).
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setRecoveryResult(null)}
                className="cyber-btn-gold px-5 py-2 rounded-lg text-xs font-bold glow-gold"
              >
                I Have Delivered / Saved This Credential
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
