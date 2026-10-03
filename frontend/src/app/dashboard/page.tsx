"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Trophy, CheckCircle2, Clock, Code2, BookOpen, ArrowRight,
  TrendingUp, BarChart3, AlertCircle, Loader2, Sparkles
} from "lucide-react";

export default function StudentDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

      async function loadDashboard() {
        try {
          const data = await api.getStudentDashboard();
          setDashboardData(data);
        } catch (err) {
          console.error("Failed to load dashboard:", err);
        } finally {
          setLoading(false);
        }
      }
      loadDashboard();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#94A3B8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#38BDF8] mb-2" />
        <span className="ml-3 text-sm">Loading Student Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full bg-[#050608]">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-[#1C2330] gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#168BFF]/10 border border-[#168BFF]/40 text-[#36C5FF] text-xs font-semibold mb-2 shadow-[0_0_12px_rgba(22,139,255,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#36C5FF]" /> Verified Student Arena
          </div>
          <h1 className="text-3xl font-extrabold text-[#F5F7FA]">
            Welcome back, <span className="text-[#36C5FF]">{user?.full_name}</span>
          </h1>
          <p className="text-xs text-[#9AA6B5] mt-1">
            Track your Python problem-solving milestones, accuracy, and active assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/tests"
            className="px-4 py-2.5 rounded-xl bg-[#10151D] border border-[#F5BD45]/50 text-[#FFD978] hover:bg-[#F5BD45]/10 font-bold text-xs transition-all flex items-center gap-1.5"
          >
            Online Tests
          </Link>
          <Link
            href="/problems"
            className="px-5 py-2.5 rounded-xl cyber-btn-blue text-xs flex items-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(22,139,255,0.3)]"
          >
            Continue Solving <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl cyber-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider">Problems Solved</span>
            <div className="w-8 h-8 rounded-lg bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/20 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-[#F5F7FA] mt-3">
            {dashboardData?.problems_solved || 0}
          </p>
          <span className="text-[11px] text-[#5F6B7C] mt-1 block">Successfully accepted solutions</span>
        </div>

        <div className="p-5 rounded-2xl cyber-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider">Accuracy Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-emerald-400 mt-3">
            {dashboardData?.accuracy_rate || 0}%
          </p>
          <span className="text-[11px] text-[#5F6B7C] mt-1 block">
            {dashboardData?.accepted_submissions || 0} accepted / {dashboardData?.total_submissions || 0} attempts
          </span>
        </div>

        <div className="p-5 rounded-2xl cyber-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider">Total Submissions</span>
            <div className="w-8 h-8 rounded-lg bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/20 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-[#F5F7FA] mt-3">
            {dashboardData?.total_submissions || 0}
          </p>
          <span className="text-[11px] text-[#5F6B7C] mt-1 block">Code runs across all problems</span>
        </div>

        <div className="p-5 rounded-2xl cyber-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider">Active Assignments</span>
            <div className="w-8 h-8 rounded-lg bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-[#36C5FF] mt-3">
            {dashboardData?.active_assignments?.length || 0}
          </p>
          <span className="text-[11px] text-[#5F6B7C] mt-1 block">Assigned by your instructors</span>
        </div>
      </div>

      {/* Main Grid: Difficulty Breakdown + Recent Activity */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (5 cols): Difficulty Progress */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl cyber-card">
            <h2 className="text-sm font-bold text-[#F5F7FA] mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#36C5FF]" /> Difficulty Progress
            </h2>

            <div className="space-y-4">
              {["Easy", "Medium", "Hard"].map((diff) => {
                const stat = dashboardData?.difficulty_stats?.[diff] || { solved: 0, total: 0 };
                const pct = stat.total > 0 ? Math.round((stat.solved / stat.total) * 100) : 0;
                const barColor =
                  diff === "Easy" ? "bg-emerald-400" : diff === "Medium" ? "bg-[#F5BD45]" : "bg-red-500";

                return (
                  <div key={diff} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#F5F7FA]">{diff}</span>
                      <span className="text-[#9AA6B5] font-mono">
                        {stat.solved} / {stat.total} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#0B0E14] overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Assignments Card */}
          <div className="p-6 rounded-2xl cyber-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#FFD978]" /> Class Assignments
              </h2>
              <Link href="/assignments" className="text-xs text-[#36C5FF] hover:underline">
                View All
              </Link>
            </div>

            {dashboardData?.active_assignments?.length === 0 ? (
              <p className="text-xs text-[#5F6B7C]">No active assignments due currently.</p>
            ) : (
              <div className="space-y-3">
                {dashboardData?.active_assignments?.map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/assignments/${a.id}`}
                    className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] hover:border-[#168BFF]/40 block transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#F5F7FA]">{a.title}</h4>
                      <span className="text-[10px] text-[#FFD978] font-mono">
                        Due: {new Date(a.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-[#9AA6B5]">{a.class_name || "General Class"}</span>
                      <span className="text-emerald-400 font-mono font-semibold">
                        Score: {a.user_total_score || 0} pts
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Recent Submissions */}
        <div className="lg:col-span-7">
          <div className="p-6 rounded-2xl cyber-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FFD978]" /> Recent Submissions
              </h2>
              <Link href="/submissions" className="text-xs text-[#36C5FF] hover:underline">
                View History
              </Link>
            </div>

            {dashboardData?.recent_submissions?.length === 0 ? (
              <div className="p-8 text-center text-[#5F6B7C]">
                <Code2 className="w-8 h-8 mx-auto mb-2 text-[#5F6B7C]" />
                <p className="text-xs">No code submissions yet.</p>
                <Link href="/problems" className="mt-3 inline-block text-xs font-bold text-[#36C5FF] hover:underline">
                  Start your first Python challenge →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#1C2330]">
                {dashboardData?.recent_submissions?.map((sub: any) => (
                  <div key={sub.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#F5F7FA]">{sub.problem_title || `Problem #${sub.problem_id}`}</p>
                      <p className="text-[11px] text-[#5F6B7C]">
                        {new Date(sub.created_at).toLocaleString()} • {sub.language || "Python"}
                      </p>
                    </div>
                    <div className="text-right">
                      {sub.marks !== null && sub.marks !== undefined ? (
                        <div>
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            {sub.marks} / {sub.max_marks || 100} pts
                          </span>
                          <p className="text-[10px] text-[#FFD978]">Evaluated</p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-bold text-[#36C5FF]">
                            {sub.status === "SUBMITTED" ? "Submitted" : sub.status}
                          </span>
                          <p className="text-[10px] text-[#5F6B7C]">Pending Review</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
