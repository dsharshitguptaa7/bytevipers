"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  RefreshCw, School, Hash, BookOpen, Calendar, Shield, Loader2
} from "lucide-react";
import ByteVipersLogo from "@/components/ByteVipersLogo";

export default function VerificationStatusPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [verification, setVerification] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      await refreshUser();
      const [vData, hData] = await Promise.all([
        api.getMyVerification(),
        api.getMyVerificationHistory(),
      ]);
      setVerification(vData);
      setHistory(hData || []);

      const status = (vData?.status || user?.verification_status || "").toLowerCase();
      if (status === "approved") {
        router.replace("/dashboard");
      } else if (status === "not_submitted") {
        router.replace("/verify-student");
      }
    } catch (err) {
      console.error("Failed to load verification status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
        return;
      }
      const vStatus = (user.verification_status || "").toLowerCase();
      if (vStatus === "approved") {
        router.replace("/dashboard");
        return;
      }
      if (vStatus === "not_submitted") {
        router.replace("/verify-student");
        return;
      }
      fetchStatus();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-16 text-[#9AA6B5]">
        <ByteVipersLogo size={48} priority className="mb-4 animate-pulse glow-gold" />
        <div className="flex items-center gap-2 text-sm text-[#F5BD45]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Retrieving verification status...</span>
        </div>
      </div>
    );
  }

  const status = (verification?.status || user?.verification_status || "not_submitted").toLowerCase();

  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 py-16 w-full">
      <div className="cyber-card p-8 sm:p-10 rounded-2xl text-center space-y-6 glow-gold relative overflow-hidden">
        {/* Top Decorative cyber line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F5BD45] to-transparent" />

        {/* Logo Emblem */}
        <div className="flex justify-center">
          <ByteVipersLogo size={56} priority />
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          {status === "approved" ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verification Approved
            </span>
          ) : status === "rejected" ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
              <AlertTriangle className="w-3.5 h-3.5" /> Verification Rejected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30">
              <Clock className="w-3.5 h-3.5 text-[#F5BD45]" /> Verification Pending
            </span>
          )}
        </div>

        {/* Main Message */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F7FA]">
            {status === "approved"
              ? "Verification Approved!"
              : status === "rejected"
              ? "Verification Needs Revision"
              : "Application Submitted Successfully!"}
          </h1>
          <p className="text-sm text-[#9AA6B5] max-w-lg mx-auto leading-relaxed">
            {status === "approved"
              ? "Your institutional enrollment has been verified. You have full access to the ByteVipers problem-solving arena."
              : status === "rejected"
              ? "Your application could not be verified with the provided credentials. Please review the reviewer notes and submit updated information."
              : "Your student verification application has been submitted successfully and is currently pending review by an authorized instructor."}
          </p>
          {status === "pending" && (
            <p className="text-xs text-[#5F6B7C] max-w-md mx-auto">
              You will get access to the ByteVipers problem-solving arena once your verification is approved.
            </p>
          )}
        </div>

        {/* Rejection Note */}
        {status === "rejected" && verification?.rejection_reason && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-left text-xs text-red-300">
            <span className="font-bold text-red-400 block mb-1">Reviewer Note:</span>
            <p>{verification.rejection_reason}</p>
          </div>
        )}

        {/* Application Summary */}
        {verification && verification.institution_name && (
          <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-left text-xs space-y-2 mt-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B7C] block">
              Application Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[#9AA6B5]">
              <div>
                <span className="text-[#5F6B7C] block">Institution:</span>
                <span className="font-semibold text-[#F5F7FA]">{verification.institution_name}</span>
              </div>
              <div>
                <span className="text-[#5F6B7C] block">Program & Roll:</span>
                <span className="font-semibold text-[#F5F7FA]">
                  {verification.course} ({verification.roll_number})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="pt-4 border-t border-[#1C2330] flex flex-col sm:flex-row items-center justify-center gap-3">
          {status === "approved" ? (
            <Link
              href="/dashboard"
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#050608] font-bold text-xs transition-all flex items-center gap-1.5"
            >
              Enter Arena Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : status === "rejected" ? (
            <Link
              href="/verify-student"
              className="cyber-btn-gold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 glow-gold"
            >
              Update & Resubmit Credentials <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <button
                onClick={fetchStatus}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0B0E14] hover:bg-[#161D28] border border-[#1C2330] text-xs font-bold text-[#F5F7FA] flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#168BFF]" /> Check Approval Status
              </button>
              <Link
                href="/problems"
                className="cyber-btn-blue w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 glow-blue"
              >
                Explore Public Arena <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
