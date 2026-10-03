"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Users, ShieldCheck, UserPlus, KeyRound, Edit, CheckCircle2,
  XCircle, Clock, RefreshCw, AlertCircle, ArrowLeft, Loader2, ArrowRightLeft, History
} from "lucide-react";

export default function TeacherCoordinatorsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [positions, setPositions] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"positions" | "reassign" | "audit">("positions");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [initModal, setInitModal] = useState<any | null>(null); // { position, title, gender }
  const [editModal, setEditModal] = useState<any | null>(null); // user object
  const [resetModal, setResetModal] = useState<any | null>(null); // user object
  const [reassignModal, setReassignModal] = useState<any | null>(null); // verification object

  // Form states
  const [initForm, setInitForm] = useState({ full_name: "", username: "", email: "", password: "" });
  const [editForm, setEditForm] = useState({ full_name: "", username: "", email: "", is_active: true });
  const [newPassword, setNewPassword] = useState("");
  const [reassignCoordId, setReassignCoordId] = useState<number | "">("");
  const [reassignReason, setReassignReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== "teacher") {
        router.replace("/login");
        return;
      }
      loadAllData();
    }
  }, [user, authLoading]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [posData, pendingData, auditData] = await Promise.all([
        api.listCoordinatorPositions(),
        api.listTeacherVerifications({ status_filter: "pending" }),
        api.listVerificationAuditHistory(),
      ]);
      setPositions(posData || []);
      setPendingVerifications(pendingData || []);
      setAuditLogs(auditData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load coordinator data.");
    } finally {
      setLoading(false);
    }
  };

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // --- Handlers ---
  const handleOpenInit = (pos: any) => {
    setInitModal(pos);
    setInitForm({ full_name: "", username: "", email: "", password: "" });
    setError(null);
  };

  const handleInitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initModal) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.initializeCoordinator({
        position: initModal.position,
        ...initForm,
      });
      setInitModal(null);
      notifySuccess(`Coordinator account created for ${initModal.title}`);
      await loadAllData();
    } catch (err: any) {
      setError(err.message || "Failed to initialize coordinator.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (acc: any) => {
    setEditModal(acc);
    setEditForm({
      full_name: acc.full_name,
      username: acc.username,
      email: acc.email,
      is_active: acc.is_active,
    });
    setError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.updateCoordinator(editModal.id, editForm);
      setEditModal(null);
      notifySuccess("Coordinator details updated successfully.");
      await loadAllData();
    } catch (err: any) {
      setError(err.message || "Failed to update coordinator.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReset = (acc: any) => {
    setResetModal(acc);
    setNewPassword("");
    setError(null);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModal || !newPassword) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.resetCoordinatorPassword(resetModal.id, newPassword);
      setResetModal(null);
      notifySuccess(`Password reset successfully for ${resetModal.username}.`);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReassign = (v: any) => {
    setReassignModal(v);
    setReassignCoordId("");
    setReassignReason("");
    setError(null);
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModal || !reassignCoordId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.reassignVerification(reassignModal.id, Number(reassignCoordId), reassignReason || undefined);
      setReassignModal(null);
      notifySuccess("Verification request reassigned successfully.");
      await loadAllData();
    } catch (err: any) {
      setError(err.message || "Failed to reassign verification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (loading && positions.length === 0)) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#94A3B8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5B942] mb-2" />
        <span className="ml-3 text-sm">Loading Coordinator Management...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8 bg-[#050608]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#1C2330] gap-4">
        <div>
          <Link
            href="/teacher"
            className="text-xs text-[#9AA6B5] hover:text-[#F5F7FA] flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Teacher Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#FFD978] uppercase tracking-wider">Super Admin</span>
            <span className="text-[#5F6B7C]">•</span>
            <span className="text-xs font-mono text-[#36C5FF]">Gender Verification Architecture</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#F5F7FA] mt-1">Coordinator Management</h1>
          <p className="text-sm text-[#9AA6B5] mt-1">
            Configure the 4 student coordinator positions, oversee verification queues, and audit decision logs.
          </p>
        </div>

        <button
          onClick={loadAllData}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#161D28] hover:bg-[#1C2433] border border-[#1C2330] hover:border-[#F5BD45]/50 text-xs font-semibold text-[#FFD978] flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#1C2330] pb-3">
        <button
          onClick={() => setActiveTab("positions")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "positions"
              ? "bg-[#10151D] text-[#FFD978] border border-[#F5BD45]/40 shadow-[0_0_12px_rgba(245,189,69,0.15)]"
              : "text-[#9AA6B5] hover:text-[#F5F7FA]"
          }`}
        >
          <Users className="w-4 h-4" /> 4 Coordinator Positions
        </button>
        <button
          onClick={() => setActiveTab("reassign")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "reassign"
              ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
              : "text-[#9AA6B5] hover:text-[#F5F7FA]"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" /> Pending Queues &amp; Reassignment ({pendingVerifications.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "audit"
              ? "bg-[#10151D] text-[#FFD978] border border-[#F5BD45]/40 shadow-[0_0_12px_rgba(245,189,69,0.12)]"
              : "text-[#9AA6B5] hover:text-[#F5F7FA]"
          }`}
        >
          <History className="w-4 h-4" /> Verification Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: 4 Coordinator Positions Grid */}
      {activeTab === "positions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {positions.map((pos) => {
            const acc = pos.account;
            const isMale = pos.gender === "Male";

            return (
              <div
                key={pos.position}
                className={`rounded-2xl p-6 border transition-all ${
                  acc
                    ? "bg-[#10151D] border-[#1C2330] hover:border-[#F5BD45]/40 shadow-lg"
                    : "bg-[#10151D]/40 border-dashed border-[#1C2330]"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-4 border-b border-[#1C2330]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isMale
                            ? "bg-[#168BFF]/15 text-[#36C5FF] border border-[#168BFF]/30"
                            : "bg-[#F5BD45]/15 text-[#FFD978] border border-[#F5BD45]/30"
                        }`}
                      >
                        {pos.gender} Coordinator
                      </span>
                      <span className="text-[10px] font-mono text-[#5F6B7C] uppercase">{pos.position}</span>
                    </div>
                    <h3 className="text-base font-bold text-[#F5F7FA] mt-1.5">{pos.title}</h3>
                  </div>

                  <div>
                    {acc ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          acc.is_active
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/15 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {acc.is_active ? "Active" : "Inactive"}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#161D28] text-[#9AA6B5] border border-[#1C2330]">
                        Uninitialized
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                {acc ? (
                  <div className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs bg-[#0B0E14] p-3.5 rounded-xl border border-[#1C2330]">
                      <div>
                        <span className="text-[#5F6B7C]">Display Name:</span>
                        <p className="font-semibold text-[#F5F7FA] mt-0.5">{acc.full_name}</p>
                      </div>
                      <div>
                        <span className="text-[#5F6B7C]">Username:</span>
                        <p className="font-mono text-[#36C5FF] mt-0.5">@{acc.username}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#5F6B7C]">Email:</span>
                        <p className="font-mono text-[#9AA6B5] mt-0.5">{acc.email}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-[#0B0E14] border border-[#1C2330]">
                        <p className="font-mono font-bold text-[#FFD978]">{acc.pending_count}</p>
                        <p className="text-[10px] text-[#5F6B7C]">Pending</p>
                      </div>
                      <div className="p-2 rounded-xl bg-[#0B0E14] border border-[#1C2330]">
                        <p className="font-mono font-bold text-emerald-400">{acc.approved_count}</p>
                        <p className="text-[10px] text-[#5F6B7C]">Approved</p>
                      </div>
                      <div className="p-2 rounded-xl bg-[#0B0E14] border border-[#1C2330]">
                        <p className="font-mono font-bold text-red-400">{acc.rejected_count}</p>
                        <p className="text-[10px] text-[#5F6B7C]">Rejected</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleOpenEdit(acc)}
                        className="flex-1 py-2 rounded-xl bg-[#161D28] hover:bg-[#1C2433] border border-[#1C2330] hover:border-[#168BFF]/40 text-xs font-semibold text-[#F5F7FA] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-[#36C5FF]" /> Edit Account
                      </button>
                      <button
                        onClick={() => handleOpenReset(acc)}
                        className="flex-1 py-2 rounded-xl bg-[#161D28] hover:bg-[#1C2433] border border-[#1C2330] hover:border-[#F5BD45]/40 text-xs font-semibold text-[#F5F7FA] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#FFD978]" /> Reset Password
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-xs text-[#9AA6B5]">
                      No coordinator account is currently active for this position.
                    </p>
                    <button
                      onClick={() => handleOpenInit(pos)}
                      className="px-4 py-2 rounded-xl cyber-btn-blue text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(22,139,255,0.3)]"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Initialize Account
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Pending Queues & Reassignment */}
      {activeTab === "reassign" && (
        <div className="rounded-2xl bg-[#10151D] border border-[#1C2330] overflow-hidden shadow-xl">
          <div className="p-5 border-b border-[#1C2330]">
            <h3 className="text-base font-bold text-[#F5F7FA]">Pending Verification Requests</h3>
            <p className="text-xs text-[#9AA6B5] mt-0.5">
              Super Admin can reassign pending student requests to an eligible coordinator of the same gender.
            </p>
          </div>

          {pendingVerifications.length === 0 ? (
            <div className="p-16 text-center text-[#9AA6B5]">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <h4 className="font-bold text-[#F5F7FA]">No Pending Verifications</h4>
              <p className="text-xs text-[#5F6B7C] mt-1">All student verification applications have been evaluated.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0E14] text-[#9AA6B5] uppercase tracking-wider font-semibold border-b border-[#1C2330]">
                  <tr>
                    <th className="py-3.5 px-6">Student</th>
                    <th className="py-3.5 px-6">Roll &amp; Institution</th>
                    <th className="py-3.5 px-6">Gender</th>
                    <th className="py-3.5 px-6">Currently Assigned To</th>
                    <th className="py-3.5 px-6">Submitted</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C2330]">
                  {pendingVerifications.map((v) => (
                    <tr key={v.id} className="hover:bg-[#161D28]/50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-[#F5F7FA]">{v.full_name}</td>
                      <td className="py-4 px-6 text-[#9AA6B5]">
                        <span className="font-mono text-[#36C5FF]">{v.roll_number}</span> • {v.institution_name}
                      </td>
                      <td className="py-4 px-6 font-semibold">
                        <span className={v.gender === "Female" ? "text-[#FFD978]" : "text-[#36C5FF]"}>
                          {v.gender || "Male"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {v.assigned_coordinator_name ? (
                          <span className="font-semibold text-[#F5F7FA]">{v.assigned_coordinator_name}</span>
                        ) : (
                          <span className="text-[#5F6B7C] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-[#5F6B7C] font-mono">
                        {new Date(v.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleOpenReassign(v)}
                          className="px-3 py-1.5 rounded-lg bg-[#168BFF]/10 hover:bg-[#168BFF]/20 border border-[#168BFF]/30 text-[#36C5FF] font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Reassign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Complete Audit Trail */}
      {activeTab === "audit" && (
        <div className="rounded-2xl bg-[#111827] border border-[#1E293B] overflow-hidden shadow-xl">
          <div className="p-5 border-b border-[#1E293B]">
            <h3 className="text-base font-bold text-[#F8FAFC]">Global Verification Audit History</h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Append-only durable event history for all applications, assignments, decisions, and reassignments.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-16 text-center text-[#94A3B8]">
              <History className="w-10 h-10 text-[#64748B] mx-auto mb-2" />
              <p className="text-xs">No audit logs recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B1020] text-[#94A3B8] uppercase tracking-wider font-semibold border-b border-[#1E293B]">
                  <tr>
                    <th className="py-3.5 px-6">Timestamp</th>
                    <th className="py-3.5 px-6">Action</th>
                    <th className="py-3.5 px-6">Student (ID)</th>
                    <th className="py-3.5 px-6">Gender</th>
                    <th className="py-3.5 px-6">Assigned Coordinator</th>
                    <th className="py-3.5 px-6">Actor (Role)</th>
                    <th className="py-3.5 px-6">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#182235]/40 transition-colors">
                      <td className="py-4 px-6 font-mono text-[#64748B]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 font-bold uppercase tracking-wider text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            log.action === "approved"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : log.action === "rejected"
                              ? "bg-red-500/15 text-red-400 border border-red-500/30"
                              : log.action === "reassigned"
                              ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                              : "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-[#F8FAFC]">
                        Student #{log.student_id}
                      </td>
                      <td className="py-4 px-6">
                        <span className={log.student_gender === "Female" ? "text-pink-400" : "text-blue-400"}>
                          {log.student_gender || "—"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[#94A3B8]">
                        {log.assigned_coordinator_name || "—"}
                      </td>
                      <td className="py-4 px-6 text-[#F8FAFC]">
                        {log.actor_name || "User"} <span className="text-[#64748B]">({log.actor_role || "—"})</span>
                      </td>
                      <td className="py-4 px-6 text-[#94A3B8] max-w-xs truncate" title={log.reason}>
                        {log.reason || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Initialize Modal */}
      {initModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#F8FAFC]">Initialize {initModal.title}</h3>
            <p className="text-xs text-[#94A3B8]">
              Create coordinator account for position <strong className="text-[#38BDF8]">{initModal.position}</strong> ({initModal.gender}).
            </p>

            <form onSubmit={handleInitSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={initForm.full_name}
                  onChange={(e) => setInitForm({ ...initForm, full_name: e.target.value })}
                  placeholder="Alex Rivera"
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">Login Username</label>
                <input
                  type="text"
                  required
                  value={initForm.username}
                  onChange={(e) => setInitForm({ ...initForm, username: e.target.value })}
                  placeholder="coord_male1"
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={initForm.email}
                  onChange={(e) => setInitForm({ ...initForm, email: e.target.value })}
                  placeholder="coord1@bytevipers.edu"
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">Initial Password (min. 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={initForm.password}
                  onChange={(e) => setInitForm({ ...initForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setInitModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#38BDF8] text-[#0B1020] font-bold text-xs disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#F8FAFC]">Edit Coordinator Account</h3>
            <p className="text-xs text-[#94A3B8]">Updating position {editModal.coordinator_position}</p>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active_toggle"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded border-[#1E293B]"
                />
                <label htmlFor="is_active_toggle" className="text-xs font-semibold text-[#F8FAFC] cursor-pointer">
                  Account is Active & Eligible for Verification Routing
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#38BDF8] text-[#0B1020] font-bold text-xs disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#F8FAFC]">Reset Coordinator Password</h3>
            <p className="text-xs text-[#94A3B8]">Resetting password for @{resetModal.username}</p>

            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">New Password (min. 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setResetModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#F5B942] text-[#0B1020] font-bold text-xs disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Verification Modal */}
      {reassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#F8FAFC]">Reassign Verification Request</h3>
            <p className="text-xs text-[#94A3B8]">
              Student: <strong className="text-[#F8FAFC]">{reassignModal.full_name}</strong> (Gender:{" "}
              <strong className="text-[#38BDF8]">{reassignModal.gender || "Male"}</strong>)
            </p>

            {/* Filter coordinators of same gender */}
            <form onSubmit={handleReassignSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                  Select Eligible Coordinator (Same Gender: {reassignModal.gender || "Male"}):
                </label>
                <select
                  required
                  value={reassignCoordId}
                  onChange={(e) => setReassignCoordId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#1E293B] text-xs text-[#F8FAFC]"
                >
                  <option value="">-- Choose Coordinator --</option>
                  {positions
                    .filter((p) => p.gender.toLowerCase() === (reassignModal.gender || "Male").toLowerCase() && p.account && p.account.is_active)
                    .map((p) => (
                      <option key={p.account.id} value={p.account.id}>
                        {p.title} ({p.account.full_name} - @{p.account.username}) [{p.account.pending_count} pending]
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">Reassignment Reason / Remarks:</label>
                <input
                  type="text"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Workload balancing by instructor."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setReassignModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reassignCoordId}
                  className="px-4 py-1.5 rounded-lg bg-[#38BDF8] text-[#0B1020] font-bold text-xs disabled:opacity-50"
                >
                  {submitting ? "Reassigning..." : "Confirm Reassignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
