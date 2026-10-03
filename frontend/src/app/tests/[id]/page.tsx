"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Clock, Award, BookOpen, AlertTriangle, ShieldCheck,
  CheckCircle2, ArrowLeft, Play, Loader2, ShieldAlert
} from "lucide-react";

export default function StudentTestOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const testId = Number(resolvedParams.id);
  const router = useRouter();
  const { user } = useAuth();

  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadTest() {
      try {
        const data = await api.getTestOverview(testId);
        setTest(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load test details.");
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [testId]);

  const isVerified = user && (user.role === "teacher" || user.verification_status === "APPROVED");

  const handleStartTest = async () => {
    if (!isVerified) {
      alert("Only verified students can start online assessments.");
      return;
    }

    if (
      !window.confirm(
        "Are you ready to begin? The countdown timer will start immediately and cannot be paused."
      )
    ) {
      return;
    }

    setStarting(true);
    setErrorMsg(null);

    try {
      await api.startTestAttempt(testId);
      router.push(`/tests/${testId}/attempt`);
    } catch (err: any) {
      // If attempt is already started, redirect to attempt page
      if (err.message && err.message.includes("already")) {
        router.push(`/tests/${testId}/attempt`);
      } else {
        setErrorMsg(err.message || "Failed to start test attempt.");
        setStarting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-16 flex items-center justify-center text-[#9AA6B5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#168BFF] mr-2" />
        <span className="text-sm">Loading test instructions...</span>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center rounded-2xl cyber-card border border-[#1C2330]">
        <AlertTriangle className="w-12 h-12 mx-auto text-[#F5BD45] mb-3" />
        <h3 className="text-base font-bold text-[#F5F7FA]">Test Not Found</h3>
        <p className="text-xs text-[#9AA6B5] mt-1">{errorMsg || "Unable to locate test."}</p>
        <Link href="/tests" className="mt-4 inline-block px-4 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs font-bold text-[#168BFF] hover:border-[#168BFF]">
          Back to Tests List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/tests" className="inline-flex items-center gap-1.5 text-xs text-[#9AA6B5] hover:text-[#F5F7FA] transition-colors">
        <ArrowLeft className="w-4 h-4 text-[#168BFF]" /> Back to Online Tests
      </Link>

      {/* Main Card */}
      <div className="cyber-card p-8 rounded-2xl space-y-6 glow-blue relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#168BFF] to-transparent" />

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30">
              {test.status}
            </span>
            <span className="text-xs text-[#5F6B7C] font-mono">Assessment ID #{test.id}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F7FA]">{test.title}</h1>
          <p className="text-xs text-[#9AA6B5] mt-2 whitespace-pre-wrap leading-relaxed">
            {test.description || "No description provided."}
          </p>
        </div>

        {/* Test Parameters Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#10151D] border border-[#1C2330] text-[#168BFF]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#5F6B7C] font-semibold">Duration</p>
              <p className="text-sm font-bold text-[#F5F7FA] font-mono">{test.duration_minutes} Minutes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#10151D] border border-[#1C2330] text-[#F5BD45]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#5F6B7C] font-semibold">Total Marks</p>
              <p className="text-sm font-bold text-[#FFD978] font-mono">{test.total_marks} Points</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#10151D] border border-[#1C2330] text-[#36C5FF]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#5F6B7C] font-semibold">Questions</p>
              <p className="text-sm font-bold text-[#F5F7FA] font-mono">{test.questions?.length || 0} Items</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#F5F7FA] uppercase tracking-wider">Candidate Instructions & Rules</h3>
          <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#9AA6B5] space-y-2 leading-relaxed whitespace-pre-wrap">
            {test.instructions || (
              <>
                <p>• The test consists of multiple question formats (MCQ, Short/Long Answer, and Programming Code).</p>
                <p>• The timer begins as soon as you click &quot;Start Test&quot; and runs continuously on the server.</p>
                <p>• Your progress is continuously saved as draft. You can navigate between questions freely.</p>
                <p>• Once time expires, any saved responses will be automatically submitted.</p>
                <p>• Submissions are manually evaluated by instructors. Marks and remarks will be visible once published.</p>
              </>
            )}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Verification Check */}
        {!isVerified ? (
          <div className="p-4 rounded-xl bg-[#F5BD45]/10 border border-[#F5BD45]/30 flex items-center justify-between text-xs text-[#FFD978]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-[#F5BD45]" />
              <span>Student verification required to take this assessment.</span>
            </div>
            <Link href="/verification-status" className="underline font-bold hover:text-[#FFD978]">
              Check Status
            </Link>
          </div>
        ) : (
          <div className="pt-2">
            <button
              onClick={handleStartTest}
              disabled={starting}
              className="cyber-btn-blue w-full py-3.5 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 glow-blue"
            >
              {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>Start Online Test Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
