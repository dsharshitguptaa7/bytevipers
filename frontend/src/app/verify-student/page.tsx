"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  ShieldCheck, School, BookOpen, Hash, Mail, FileText,
  AlertCircle, CheckCircle2, Loader2, ArrowRight, Clock,
  RefreshCw, RotateCcw
} from "lucide-react";

export default function VerifyStudentPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    institutionName: "",
    department: "",
    course: "",
    semester: "1st Semester",
    rollNumber: "",
    institutionalEmail: "",
    verificationMethod: "student_id",
  });

  const [verificationData, setVerificationData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowResubmit, setAllowResubmit] = useState(false);
  const [statusChecking, setStatusChecking] = useState(false);

  // Fetch current verification record from DB
  const loadVerificationData = async () => {
    try {
      const v = await api.getMyVerification();
      setVerificationData(v);
      if (v && v.institution_name) {
        setFormData({
          fullName: v.full_name || user?.full_name || "",
          institutionName: v.institution_name || "",
          department: v.department || "",
          course: v.course || "",
          semester: v.semester || "1st Semester",
          rollNumber: v.roll_number || "",
          institutionalEmail: v.institutional_email || "",
          verificationMethod: v.verification_method || "student_id",
        });
      }
    } catch (err) {
      console.error("Failed to load verification record:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
        return;
      }

      // Check current verification status
      const vStatus = (user.verification_status || "not_submitted").toLowerCase();
      if (vStatus === "approved") {
        router.replace("/dashboard");
        return;
      }

      if (user.full_name && !formData.fullName) {
        setFormData((prev) => ({ ...prev, fullName: user.full_name }));
      }

      loadVerificationData();
    }
  }, [user, authLoading, router]);

  // Handle manual refresh
  const handleCheckStatus = async () => {
    setStatusChecking(true);
    try {
      await refreshUser();
      const updated = await api.getMyVerification();
      setVerificationData(updated);
      if (updated?.status?.toLowerCase() === "approved") {
        router.replace("/dashboard");
      }
    } catch (err) {
      console.error("Error refreshing status:", err);
    } finally {
      setStatusChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.submitVerification({
        full_name: formData.fullName,
        institution_name: formData.institutionName,
        department: formData.department,
        course: formData.course,
        semester: formData.semester,
        roll_number: formData.rollNumber,
        institutional_email: formData.institutionalEmail || undefined,
        verification_method: formData.verificationMethod,
      });

      setVerificationData(res);
      setAllowResubmit(false);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || "Failed to submit verification application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-16 text-[#9AA6B5] bg-[#050608]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5BD45] mr-2" />
        <span className="text-sm font-mono">Verifying student credentials...</span>
      </div>
    );
  }

  // Determine current effective status
  const currentStatus = (
    verificationData?.status ||
    user?.verification_status ||
    "not_submitted"
  ).toLowerCase();

  // Redirect if already approved
  if (currentStatus === "approved") {
    router.replace("/dashboard");
    return (
      <div className="flex-1 flex items-center justify-center p-16 text-[#9AA6B5] bg-[#050608]">
        <Loader2 className="w-8 h-8 animate-spin text-[#22C55E] mr-2" />
        <span className="text-sm text-[#22C55E] font-mono">Verification approved! Entering arena dashboard...</span>
      </div>
    );
  }

  // 1. Pending Confirmation Screen
  if (currentStatus === "pending" && !allowResubmit) {
    return (
      <div className="flex-1 max-w-2xl mx-auto px-4 py-16 w-full flex items-center justify-center">
        <div className="p-8 sm:p-10 rounded-2xl bg-[#10151D] border border-[#222B3B] shadow-[0_0_40px_rgba(0,0,0,0.8)] text-center space-y-6 w-full relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#F5BD45] to-transparent rounded-full" />

          {/* Status Badge */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/40 shadow-[0_0_12px_rgba(245,189,69,0.15)]">
              <Clock className="w-3.5 h-3.5" /> Verification Pending
            </span>
          </div>

          {/* Success Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F5BD45]/10 border border-[#F5BD45]/30 flex items-center justify-center text-[#FFD978]">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          {/* Main Title & Confirmation Paragraphs */}
          <div className="space-y-3">
            <h1 className="text-2xl font-extrabold text-[#F5F7FA]">
              Application Submitted Successfully!
            </h1>
            <p className="text-sm text-[#F5F7FA]/90 max-w-lg mx-auto leading-relaxed">
              Your student verification application has been submitted successfully and is currently pending review by an authorized instructor or coordinator.
            </p>
            <p className="text-xs text-[#9AA6B5] max-w-md mx-auto">
              You will get access to the ByteVipers problem-solving arena once your verification is approved.
            </p>
          </div>

          {/* Application Summary Card */}
          {verificationData && verificationData.institution_name && (
            <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-left text-xs space-y-2 mt-6">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5F6B7C] block">
                Submitted Application Summary
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[#9AA6B5]">
                <div>
                  <span className="text-[#5F6B7C] block">Institution:</span>
                  <span className="font-semibold text-[#F5F7FA]">{verificationData.institution_name}</span>
                </div>
                <div>
                  <span className="text-[#5F6B7C] block">Program &amp; Roll:</span>
                  <span className="font-semibold text-[#F5F7FA]">
                    {verificationData.course} ({verificationData.roll_number})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#1C2330] flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={statusChecking}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#161D28] hover:bg-[#1C2433] border border-[#1C2330] text-xs font-bold text-[#F5F7FA] flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#36C5FF] ${statusChecking ? "animate-spin" : ""}`} />
              Check Approval Status
            </button>

            <Link
              href="/problems"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl cyber-btn-blue text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(22,139,255,0.3)]"
            >
              <span>Explore Public Problems</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Rejected Screen (with allowed resubmission)
  if (currentStatus === "rejected" && !allowResubmit) {
    return (
      <div className="flex-1 max-w-2xl mx-auto px-4 py-16 w-full flex items-center justify-center">
        <div className="p-8 sm:p-10 rounded-2xl bg-[#10151D] border border-red-500/30 shadow-2xl text-center space-y-6 w-full">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-red-500/10 text-red-400 border border-red-500/30">
              <AlertCircle className="w-3.5 h-3.5" /> Verification Rejected
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-[#F5F7FA]">Application Needs Revision</h1>
            <p className="text-xs text-[#9AA6B5]">
              Your student verification application was reviewed and could not be approved with the provided credentials.
            </p>
          </div>

          {verificationData?.rejection_reason && (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-left text-xs text-red-300">
              <span className="font-bold text-red-400 block mb-1">Coordinator / Reviewer Note:</span>
              <p>{verificationData.rejection_reason}</p>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setAllowResubmit(true)}
              className="px-6 py-2.5 rounded-xl cyber-btn-gold text-xs inline-flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,189,69,0.3)]"
            >
              <RotateCcw className="w-4 h-4 text-[#050608]" />
              <span>Submit Corrected Application</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Not Submitted (or Resubmission Active) -> Display Verification Form
  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
      <div className="p-8 sm:p-9 rounded-2xl bg-[#10151D] border border-[#222B3B] shadow-[0_0_40px_rgba(0,0,0,0.8)] relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#F5BD45] to-transparent rounded-full" />

        <div className="flex items-center gap-3.5 mb-6 pb-6 border-b border-[#1C2330]">
          <div className="w-12 h-12 rounded-xl bg-[#F5BD45]/10 border border-[#F5BD45]/30 flex items-center justify-center text-[#FFD978]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Student Verification Application</h1>
            <p className="text-xs text-[#9AA6B5]">
              Verify your institutional enrollment to unlock the ByteVipers problem solving arena
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Jane Doe"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
                College / Institution Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.institutionName}
                  onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                  placeholder="e.g. Stanford University / MIT / IIT"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)]"
                />
                <School className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
                Department *
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
                Course / Program *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  placeholder="e.g. B.S. / B.Tech / M.S."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)]"
                />
                <BookOpen className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
                Semester / Year *
              </label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] focus:outline-none focus:border-[#168BFF]"
              >
                <option value="1st Semester">1st Semester / Year 1</option>
                <option value="2nd Semester">2nd Semester / Year 1</option>
                <option value="3rd Semester">3rd Semester / Year 2</option>
                <option value="4th Semester">4th Semester / Year 2</option>
                <option value="5th Semester">5th Semester / Year 3</option>
                <option value="6th Semester">6th Semester / Year 3</option>
                <option value="7th Semester">7th Semester / Year 4</option>
                <option value="8th Semester">8th Semester / Year 4</option>
                <option value="Postgraduate">Postgraduate / Masters</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
                Roll Number / Student ID *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  placeholder="e.g. CS2026-089"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)]"
                />
                <Hash className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
                Institutional Email (Optional)
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.institutionalEmail}
                  onChange={(e) => setFormData({ ...formData, institutionalEmail: e.target.value })}
                  placeholder="jane.doe@univ.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)]"
                />
                <Mail className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase tracking-wider">
                Verification Method
              </label>
              <select
                value={formData.verificationMethod}
                onChange={(e) => setFormData({ ...formData, verificationMethod: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] focus:outline-none focus:border-[#168BFF]"
              >
                <option value="student_id">Student ID Card / Roll Verification</option>
                <option value="institutional_email">Institutional Email Domain Confirmation</option>
                <option value="instructor_code">Instructor Assigned Roster Code</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1C2330] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[#5F6B7C]">All submitted credentials are reviewed by designated student coordinators.</p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl cyber-btn-gold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(245,189,69,0.3)]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin text-[#050608]" /> : (
                <>
                  <span>Submit Application</span>
                  <ArrowRight className="w-4 h-4 text-[#050608]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
