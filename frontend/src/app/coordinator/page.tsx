"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  ShieldCheck, Users, Clock, CheckCircle2, XCircle, Search, Filter,
  FileText, ArrowRight, RefreshCw, AlertCircle, Loader2, UserCheck, Eye
} from "lucide-react";

export default function CoordinatorPortalPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [myAssignedOnly, setMyAssignedOnly] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Modal State
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
        return;
      }
      if (user.role !== "coordinator" && user.role !== "teacher") {
        router.replace("/problems");
        return;
      }
      loadData();
    }
  }, [user, authLoading, statusFilter, myAssignedOnly, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, listData] = await Promise.all([
        api.getCoordinatorStats().catch(() => null),
        api.listCoordinatorVerifications({
          status_filter: statusFilter === "all" ? undefined : statusFilter,
          my_assigned_only: myAssignedOnly,
          search: search || undefined,
        }),
      ]);
      setStats(statsData);
      setVerifications(listData || []);
    } catch (err: any) {
      console.error("Failed to load coordinator data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (v: any) => {
    setSelectedVerification(v);
    setReviewNotes("");
    setRejectionReason("");
    setActionError(null);
    setShowRejectForm(false);
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;
    setSubmittingAction(true);
    setActionError(null);
    try {
      await api.coordinatorApproveVerification(selectedVerification.id, reviewNotes || undefined);
      setSelectedVerification(null);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to approve verification.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification) return;
    if (!rejectionReason.trim()) {
      setActionError("Please provide a reason for rejection.");
      return;
    }
    setSubmittingAction(true);
    setActionError(null);
    try {
      await api.coordinatorRejectVerification(
        selectedVerification.id,
        rejectionReason.trim(),
        reviewNotes || undefined
      );
      setSelectedVerification(null);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to reject verification.");
    } finally {
      setSubmittingAction(false);
    }
  };

  if (authLoading || (loading && !stats && verifications.length === 0)) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#94A3B8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#38BDF8] mb-2" />
        <span className="ml-3 text-sm">Loading Coordinator Workspace...</span>
      </div>
    );
  }

  const coordGender = user?.gender || "Male";
  const positionTitle = user?.coordinator_position
    ? user.coordinator_position.replace("_", " ").toUpperCase()
    : "STUDENT COORDINATOR";

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8 bg-[#050608]">
      {/* Top Banner */}
      <div className="rounded-2xl bg-[#10151D] border border-[#222B3B] p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-[#168BFF]/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#168BFF]/15 text-[#36C5FF] border border-[#168BFF]/30">
                {positionTitle}
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#F5BD45]/15 text-[#FFD978] border border-[#F5BD45]/30">
                {coordGender} Student Verification Desk
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F7FA]">
              Student Coordinator Verification Portal
            </h1>
            <p className="text-xs sm:text-sm text-[#9AA6B5] mt-1">
              Authorized to verify and evaluate <strong className="text-[#36C5FF]">{coordGender}</strong> student applications. Think. Code. Conquer.
            </p>
          </div>

          <button
            onClick={loadData}
            className="self-start md:self-auto px-4 py-2 rounded-xl bg-[#161D28] hover:bg-[#1C2433] border border-[#1C2330] hover:border-[#168BFF]/50 text-xs font-semibold text-[#F5F7FA] flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#36C5FF]" /> Refresh Queue
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl cyber-card-gold">
          <div className="flex items-center justify-between text-xs text-[#9AA6B5] font-semibold mb-2">
            <span>My Assigned Pending</span>
            <Clock className="w-4 h-4 text-[#FFD978]" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-[#FFD978]">
            {stats?.my_pending_count ?? 0}
          </p>
          <p className="text-[11px] text-[#5F6B7C] mt-1">Requests assigned to you</p>
        </div>

        <div className="p-5 rounded-2xl cyber-card-blue">
          <div className="flex items-center justify-between text-xs text-[#9AA6B5] font-semibold mb-2">
            <span>Total {coordGender} Queue</span>
            <Users className="w-4 h-4 text-[#36C5FF]" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-[#36C5FF]">
            {stats?.gender_queue_pending_count ?? 0}
          </p>
          <p className="text-[11px] text-[#5F6B7C] mt-1">All pending {coordGender.toLowerCase()} students</p>
        </div>

        <div className="p-5 rounded-2xl cyber-card">
          <div className="flex items-center justify-between text-xs text-[#9AA6B5] font-semibold mb-2">
            <span>Approved by Me</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-emerald-400">
            {stats?.my_approved_count ?? 0}
          </p>
          <p className="text-[11px] text-[#5F6B7C] mt-1">Total approved applications</p>
        </div>

        <div className="p-5 rounded-2xl cyber-card">
          <div className="flex items-center justify-between text-xs text-[#9AA6B5] font-semibold mb-2">
            <span>Rejected by Me</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-red-400">
            {stats?.my_rejected_count ?? 0}
          </p>
          <p className="text-[11px] text-[#5F6B7C] mt-1">Returned for correction</p>
        </div>
      </div>

      {/* Queue Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Toggle between My Assigned and All Gender Requests */}
        <div className="inline-flex p-1 rounded-xl bg-[#10151D] border border-[#1C2330]">
          <button
            onClick={() => setMyAssignedOnly(true)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              myAssignedOnly
                ? "bg-[#168BFF] text-[#F5F7FA] shadow-[0_0_12px_rgba(22,139,255,0.3)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA]"
            }`}
          >
            My Assigned Queue
          </button>
          <button
            onClick={() => setMyAssignedOnly(false)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              !myAssignedOnly
                ? "bg-[#168BFF] text-[#F5F7FA] shadow-[0_0_12px_rgba(22,139,255,0.3)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA]"
            }`}
          >
            All {coordGender} Requests
          </button>
        </div>

        {/* Status Pills & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {["pending", "approved", "rejected", "all"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-[#10151D] border-[#168BFF] text-[#36C5FF] shadow-[0_0_10px_rgba(22,139,255,0.2)]"
                  : "bg-[#0B0E14] border-[#1C2330] text-[#9AA6B5] hover:border-[#222B3B]"
              }`}
            >
              {st}
            </button>
          ))}

          <div className="relative min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / roll..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF]"
            />
            <Search className="w-3.5 h-3.5 text-[#5F6B7C] absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Verification Applications List */}
      <div className="rounded-2xl bg-[#10151D] border border-[#1C2330] overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-[#9AA6B5]">
            <Loader2 className="w-8 h-8 animate-spin text-[#36C5FF] mb-2" />
            <span className="text-xs font-mono">Fetching queue items...</span>
          </div>
        ) : verifications.length === 0 ? (
          <div className="p-16 text-center text-[#9AA6B5]">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2 opacity-80" />
            <h3 className="text-base font-bold text-[#F5F7FA]">Queue is Clear!</h3>
            <p className="text-xs text-[#5F6B7C] mt-1">
              No {statusFilter !== "all" ? statusFilter : ""} verification applications found for {coordGender.toLowerCase()} students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0E14] text-[#9AA6B5] uppercase tracking-wider font-semibold border-b border-[#1C2330]">
                <tr>
                  <th className="py-3.5 px-6">Student</th>
                  <th className="py-3.5 px-6">Roll Number</th>
                  <th className="py-3.5 px-6">Department &amp; Course</th>
                  <th className="py-3.5 px-6">Assigned Coordinator</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Submitted</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2330]">
                {verifications.map((v) => {
                  const isAssignedToMe = v.assigned_coordinator_id === user?.id;
                  const st = (v.status || "").toLowerCase();
                  return (
                    <tr key={v.id} className="hover:bg-[#161D28]/60 transition-colors">
                      <td className="py-4 px-6 font-semibold text-[#F5F7FA]">
                        <div>{v.full_name}</div>
                        <div className="text-[11px] text-[#5F6B7C]">{v.institution_name}</div>
                      </td>

                      <td className="py-4 px-6 font-mono text-[#36C5FF]">
                        {v.roll_number}
                      </td>

                      <td className="py-4 px-6 text-[#9AA6B5]">
                        <div>{v.course}</div>
                        <div className="text-[11px] text-[#5F6B7C]">{v.department} • {v.semester}</div>
                      </td>

                      <td className="py-4 px-6">
                        {isAssignedToMe ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#168BFF]/15 text-[#36C5FF] border border-[#168BFF]/30 text-[11px] font-semibold">
                            Assigned to You
                          </span>
                        ) : v.assigned_coordinator_name ? (
                          <span className="text-[#9AA6B5] text-[11px]">
                            {v.assigned_coordinator_name}
                          </span>
                        ) : (
                          <span className="text-[#5F6B7C] italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            st === "approved"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : st === "rejected"
                              ? "bg-red-500/15 text-red-400 border border-red-500/30"
                              : "bg-[#F5BD45]/15 text-[#FFD978] border border-[#F5BD45]/30"
                          }`}
                        >
                          {st === "approved" ? "Approved" : st === "rejected" ? "Rejected" : "Pending"}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-[#5F6B7C] font-mono">
                        {new Date(v.submitted_at).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleOpenReview(v)}
                          className="px-3 py-1.5 rounded-lg bg-[#168BFF]/10 hover:bg-[#168BFF]/20 border border-[#168BFF]/30 text-[#36C5FF] font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#10151D] border border-[#222B3B] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1C2330]">
              <div>
                <h3 className="text-lg font-bold text-[#F5F7FA]">Review Student Verification</h3>
                <p className="text-xs text-[#9AA6B5]">Application #{selectedVerification.id} • {selectedVerification.full_name}</p>
              </div>
              <button
                onClick={() => setSelectedVerification(null)}
                className="p-1 rounded-lg text-[#9AA6B5] hover:text-[#F5F7FA] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Application Data Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-[#0B0E14] p-4 rounded-xl border border-[#1C2330]">
              <div>
                <span className="text-[#5F6B7C] uppercase font-semibold">Student Name:</span>
                <p className="text-[#F5F7FA] font-semibold mt-0.5">{selectedVerification.full_name}</p>
              </div>
              <div>
                <span className="text-[#5F6B7C] uppercase font-semibold">Gender Group:</span>
                <p className="text-[#36C5FF] font-semibold mt-0.5">{selectedVerification.gender || coordGender}</p>
              </div>
              <div>
                <span className="text-[#5F6B7C] uppercase font-semibold">Institution:</span>
                <p className="text-[#F5F7FA] mt-0.5">{selectedVerification.institution_name}</p>
              </div>
              <div>
                <span className="text-[#5F6B7C] uppercase font-semibold">Roll Number:</span>
                <p className="text-[#F5F7FA] font-mono mt-0.5">{selectedVerification.roll_number}</p>
              </div>
              <div>
                <span className="text-[#5F6B7C] uppercase font-semibold">Course &amp; Semester:</span>
                <p className="text-[#F5F7FA] mt-0.5">{selectedVerification.course} ({selectedVerification.semester})</p>
              </div>
              <div>
                <span className="text-[#5F6B7C] uppercase font-semibold">Department:</span>
                <p className="text-[#F5F7FA] mt-0.5">{selectedVerification.department}</p>
              </div>
              <div>
                <span className="text-[#5F6B7C] uppercase font-semibold">Institutional Email:</span>
                <p className="text-[#F5F7FA] font-mono mt-0.5">{selectedVerification.institutional_email || "N/A"}</p>
              </div>
              <div>
                <span className="text-[#5F6B7C] uppercase font-semibold">Verification Method:</span>
                <p className="text-[#F5F7FA] capitalize mt-0.5">{selectedVerification.verification_method}</p>
              </div>
            </div>

            {/* Document Reference / ID Preview */}
            {selectedVerification.document_reference && (
              <div className="p-3 rounded-xl bg-[#161D28]/40 border border-[#1C2330] text-xs">
                <span className="text-[#9AA6B5] font-semibold">Attached ID Document Reference:</span>
                <p className="font-mono text-[#36C5FF] break-all mt-1">{selectedVerification.document_reference}</p>
              </div>
            )}

            {/* Audit History Timeline */}
            {selectedVerification.audit_logs && selectedVerification.audit_logs.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider mb-2">Audit History</h4>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {selectedVerification.audit_logs.map((log: any) => (
                    <div key={log.id} className="p-2.5 rounded-lg bg-[#0B0E14] border border-[#1C2330] text-[11px] flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-[#F5F7FA] capitalize">{log.action || "Status Change"}:</span>{" "}
                        <span className="text-[#9AA6B5]">{log.reason || "No remarks"}</span>
                        <div className="text-[10px] text-[#5F6B7C] mt-0.5">
                          Actor: {log.actor_name || log.actor_role || "System"} • Assigned: {log.assigned_coordinator_name || "Unassigned"}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#5F6B7C] shrink-0 ml-2">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Section */}
            <div className="space-y-3 pt-2 border-t border-[#1C2330]">
              <div>
                <label className="block text-xs font-semibold text-[#9AA6B5] mb-1">
                  Coordinator Remarks (Optional):
                </label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Verified student institutional identity card."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF]"
                />
              </div>

              {showRejectForm ? (
                <div className="space-y-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30">
                  <label className="block text-xs font-semibold text-red-400">
                    Rejection Reason (Required for Student Feedback):
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify why the application was rejected (e.g., blurry student ID image, invalid roll number)."
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-red-500/30 text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-red-400"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#9AA6B5] hover:text-[#F5F7FA] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingAction}
                      onClick={handleReject}
                      className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
                    >
                      {submittingAction ? "Rejecting..." : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs transition-all cursor-pointer"
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={handleApprove}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] text-[#050608] font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[#050608]" />}
                    Approve Verification
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
