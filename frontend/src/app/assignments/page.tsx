"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  BookOpen, Plus, Clock, CheckCircle2, ArrowRight,
  School, AlertCircle, Loader2, Key
} from "lucide-react";

export default function StudentAssignmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assigns, myClasses] = await Promise.all([
        api.getMyAssignments(),
        api.getMyClasses(),
      ]);
      setAssignments(assigns);
      setClasses(myClasses);
    } catch (err) {
      console.error("Failed to load assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
        return;
      }
      const vStatus = (user.verification_status || "not_submitted").toLowerCase();
      if (user.role === "student" && vStatus !== "approved") {
        router.replace("/verify-student");
        return;
      }
      loadData();
    }
  }, [user, authLoading, router]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError(null);
    setEnrollSuccess(null);
    try {
      const enrolled = await api.enrollClass(enrollCode);
      setEnrollSuccess(`Successfully enrolled in ${enrolled.name}!`);
      setEnrollCode("");
      await loadData();
    } catch (err: any) {
      setEnrollError(err.message || "Enrollment failed.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#9AA6B5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#168BFF] mb-2" />
        <span className="ml-3 text-sm">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-[#1C2330] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30 uppercase tracking-wider">
              Academic Arena
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#F5F7FA]">Class Assignments</h1>
          <p className="text-sm text-[#9AA6B5] mt-1">
            Complete instructor-assigned Python problem sets and assessments.
          </p>
        </div>

        {/* Enroll form */}
        <form onSubmit={handleEnroll} className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              required
              value={enrollCode}
              onChange={(e) => setEnrollCode(e.target.value.toUpperCase())}
              placeholder="CLASS CODE"
              maxLength={8}
              className="pl-8 pr-3 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs font-mono font-bold text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] uppercase tracking-wider w-36"
            />
            <Key className="w-3.5 h-3.5 text-[#5F6B7C] absolute left-2.5 top-2.5" />
          </div>
          <button
            type="submit"
            className="cyber-btn-blue px-4 py-2 rounded-xl text-xs font-bold glow-blue"
          >
            Enroll
          </button>
        </form>
      </div>

      {enrollSuccess && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
          {enrollSuccess}
        </div>
      )}
      {enrollError && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{enrollError}</span>
        </div>
      )}

      {/* Enrolled Classes Bar */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#5F6B7C]">Enrolled Cohorts:</span>
        {classes.length === 0 ? (
          <span className="text-xs text-[#9AA6B5] italic">Not enrolled in any classes yet.</span>
        ) : (
          classes.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10151D] border border-[#1C2330] text-xs font-medium text-[#F5F7FA]"
            >
              <School className="w-3.5 h-3.5 text-[#36C5FF]" />
              {c.name}
            </span>
          ))
        )}
      </div>

      {/* Assignments List */}
      <div className="mt-8 space-y-4">
        {assignments.length === 0 ? (
          <div className="p-16 rounded-2xl cyber-card text-center text-[#9AA6B5]">
            <BookOpen className="w-10 h-10 mx-auto text-[#5F6B7C] mb-3" />
            <h3 className="text-base font-bold text-[#F5F7FA]">No Published Assignments</h3>
            <p className="text-xs mt-1 text-[#5F6B7C]">
              Ask your teacher for a class code to enroll and view course assessments.
            </p>
          </div>
        ) : (
          assignments.map((a) => (
            <div
              key={a.id}
              className="cyber-card p-6 rounded-2xl hover:border-[#168BFF]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#168BFF]/10 border border-[#168BFF]/30 text-[#36C5FF] font-mono">
                    {a.class_name || "General"}
                  </span>
                  <span className="text-xs text-[#5F6B7C] font-mono">
                    Due: {new Date(a.due_date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#F5F7FA] mt-2">{a.title}</h3>
                <p className="text-xs text-[#9AA6B5] mt-1">{a.description || "Complete all assigned challenges."}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-[#5F6B7C]">
                  <span>Problems: <span className="text-[#F5F7FA] font-mono">{a.problems?.length || 0}</span></span>
                  <span>Attempts: <span className="text-[#F5F7FA] font-mono">{a.user_attempts || 0}</span></span>
                  <span className="text-emerald-400 font-bold font-mono">Score: {a.user_total_score || 0} pts</span>
                </div>
              </div>

              <Link
                href={`/assignments/${a.id}`}
                className="px-5 py-2.5 rounded-xl bg-[#0B0E14] hover:bg-[#168BFF] hover:text-[#050608] text-[#36C5FF] border border-[#168BFF]/30 font-bold text-xs transition-all flex items-center gap-2 shrink-0 self-start sm:self-center"
              >
                Open Assignment <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
