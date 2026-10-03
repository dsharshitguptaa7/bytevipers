"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  ShieldCheck, Search, Filter, CheckCircle2, XCircle, AlertTriangle,
  Clock, RefreshCw, Loader2, AlertCircle, Eye, X
} from "lucide-react";

export default function TeacherVerificationsPage() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // Review modal action states
  const [modalAction, setModalAction] = useState<"approve" | "reject" | "resubmit" | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const data = await api.listTeacherVerifications({
        status_filter: statusFilter || undefined,
        search: search || undefined,
      });
      setVerifications(data);
    } catch (err) {
      console.error("Failed to load verifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadVerifications, 200);
    return () => clearTimeout(timer);
  }, [statusFilter, search]);

  const handleExecuteAction = async () => {
    if (!selectedApp || !modalAction) return;
    setActionLoading(true);
    setActionError(null);

    try {
      if (modalAction === "approve") {
        await api.approveVerification(selectedApp.id, reviewerNotes);
      } else if (modalAction === "reject") {
        if (!actionReason) throw new Error("Rejection reason is required.");
        await api.rejectVerification(selectedApp.id, actionReason, reviewerNotes);
      } else if (modalAction === "resubmit") {
        if (!actionReason) throw new Error("Resubmission reason is required.");
        await api.requestResubmission(selectedApp.id, actionReason, reviewerNotes);
      }

      setModalAction(null);
      setSelectedApp(null);
      setReviewerNotes("");
      setActionReason("");
      await loadVerifications();
    } catch (err: any) {
      setActionError(err.message || "Failed to complete review action.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 text-xs">APPROVED</span>;
      case "REJECTED":
        return <span className="text-red-400 font-bold bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20 text-xs">REJECTED</span>;
      case "RESUBMISSION_REQUIRED":
        return <span className="text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 text-xs">RESUBMISSION</span>;
      default:
        return <span className="text-[#F5B942] font-bold bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20 text-xs">PENDING</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#1C2330] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 uppercase tracking-wider">
              Super Admin Verification Governance
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Student Verification Queue</h1>
          <p className="text-xs text-[#9AA6B5] mt-1">
            Review and govern institutional enrollment applications for full platform arena access.
          </p>
        </div>
        <button
          onClick={loadVerifications}
          className="p-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-[#9AA6B5] hover:text-[#F5F7FA] hover:border-[#F5BD45]/40 transition-colors self-start sm:self-center"
        >
          <RefreshCw className={`w-4 h-4 text-[#F5BD45] ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll number, or institution..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
          />
          <Search className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#F5BD45]"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="RESUBMISSION_REQUIRED">Resubmission Required</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="cyber-card rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 flex items-center justify-center text-[#9AA6B5]">
            <Loader2 className="w-6 h-6 animate-spin text-[#F5BD45] mr-2" />
            <span className="text-xs">Loading application records...</span>
          </div>
        ) : verifications.length === 0 ? (
          <div className="p-16 text-center text-[#9AA6B5]">
            <ShieldCheck className="w-10 h-10 mx-auto text-[#5F6B7C] mb-2" />
            <h3 className="text-sm font-bold text-[#F5F7FA]">Queue Empty</h3>
            <p className="text-xs text-[#5F6B7C] mt-1">No verification applications match the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0E14] text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                <tr>
                  <th className="py-3 px-6">Student Name</th>
                  <th className="py-3 px-6">Institution</th>
                  <th className="py-3 px-6">Roll Number</th>
                  <th className="py-3 px-6">Department & Course</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2330]">
                {verifications.map((v) => (
                  <tr key={v.id} className="hover:bg-[#161D28]/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-[#F5F7FA]">{v.full_name}</td>
                    <td className="py-4 px-6 text-[#9AA6B5]">{v.institution_name}</td>
                    <td className="py-4 px-6 font-mono text-[#F5F7FA]">{v.roll_number}</td>
                    <td className="py-4 px-6 text-[#9AA6B5]">{v.department} • {v.course}</td>
                    <td className="py-4 px-6">{getStatusBadge(v.status)}</td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => setSelectedApp(v)}
                        className="px-3 py-1.5 rounded-lg bg-[#0B0E14] text-[#FFD978] border border-[#F5BD45]/30 hover:bg-[#F5BD45] hover:text-[#050608] transition-all font-semibold"
                      >
                        Inspect & Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl cyber-card border border-[#1C2330] shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto glow-gold">
            <div className="flex items-center justify-between pb-4 border-b border-[#1C2330]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#F5BD45]" />
                <h3 className="text-base font-bold text-[#F5F7FA]">Application Review: {selectedApp.full_name}</h3>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-[#5F6B7C] hover:text-[#F5F7FA] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Application Data */}
            <div className="mt-5 grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs">
              <div>
                <p className="text-[#5F6B7C]">Institution</p>
                <p className="font-semibold text-[#F5F7FA] mt-0.5">{selectedApp.institution_name}</p>
              </div>
              <div>
                <p className="text-[#5F6B7C]">Department & Course</p>
                <p className="font-semibold text-[#F5F7FA] mt-0.5">{selectedApp.department} • {selectedApp.course}</p>
              </div>
              <div>
                <p className="text-[#5F6B7C]">Roll Number / ID</p>
                <p className="font-semibold text-[#F5F7FA] mt-0.5 font-mono">{selectedApp.roll_number}</p>
              </div>
              <div>
                <p className="text-[#5F6B7C]">Semester / Year</p>
                <p className="font-semibold text-[#F5F7FA] mt-0.5">{selectedApp.semester}</p>
              </div>
              <div>
                <p className="text-[#5F6B7C]">Institutional Email</p>
                <p className="font-semibold text-[#F5F7FA] mt-0.5">{selectedApp.institutional_email || "None provided"}</p>
              </div>
              <div>
                <p className="text-[#5F6B7C]">Current Status</p>
                <div className="mt-1">{getStatusBadge(selectedApp.status)}</div>
              </div>
            </div>

            {/* Decision Actions */}
            <div className="mt-6 pt-4 border-t border-[#1C2330]">
              <h4 className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider mb-3">Review Action</h4>

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setModalAction("approve")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    modalAction === "approve"
                      ? "bg-emerald-500 text-[#050608]"
                      : "bg-[#0B0E14] text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  Approve Application
                </button>
                <button
                  type="button"
                  onClick={() => setModalAction("reject")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    modalAction === "reject"
                      ? "bg-red-500 text-white"
                      : "bg-[#0B0E14] text-red-400 border border-red-500/30"
                  }`}
                >
                  Reject Application
                </button>
                <button
                  type="button"
                  onClick={() => setModalAction("resubmit")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    modalAction === "resubmit"
                      ? "bg-[#F5BD45] text-[#050608]"
                      : "bg-[#0B0E14] text-[#FFD978] border border-[#F5BD45]/30"
                  }`}
                >
                  Request Resubmission
                </button>
              </div>

              {modalAction && (
                <div className="space-y-3 p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330]">
                  {(modalAction === "reject" || modalAction === "resubmit") && (
                    <div>
                      <label className="block text-xs font-semibold text-red-400 mb-1">
                        Reason / Resubmission Instructions *
                      </label>
                      <input
                        type="text"
                        required
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        placeholder="Provide explanation for the student..."
                        className="w-full px-3 py-2 rounded-lg bg-[#10151D] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-red-400"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#9AA6B5] mb-1">
                      Internal Reviewer Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      placeholder="Notes recorded in verification audit log..."
                      className="w-full px-3 py-2 rounded-lg bg-[#10151D] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModalAction(null)}
                      className="px-3.5 py-1.5 rounded-lg text-xs text-[#9AA6B5] hover:text-[#F5F7FA]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleExecuteAction}
                      className="cyber-btn-gold px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 glow-gold"
                    >
                      {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm & Execute"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
