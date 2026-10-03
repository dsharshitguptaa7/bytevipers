"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  BookOpen, Clock, CheckCircle2, ArrowRight, ArrowLeft,
  Loader2, Trophy, Code2
} from "lucide-react";

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = parseInt(resolvedParams.id, 10);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
        return;
      }
      async function loadAssignment() {
        try {
          const data = await api.getAssignmentDetail(assignmentId);
          setAssignment(data);
        } catch (err) {
          console.error("Failed to load assignment:", err);
        } finally {
          setLoading(false);
        }
      }
      loadAssignment();
    }
  }, [user, authLoading, assignmentId, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#9AA6B5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#168BFF] mb-2" />
        <span className="ml-3 text-sm">Loading Assignment Details...</span>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-center text-[#9AA6B5]">
        <div className="cyber-card p-8 rounded-2xl max-w-md">
          <h2 className="text-xl font-bold text-[#F5F7FA]">Assignment Not Found</h2>
          <Link href="/assignments" className="mt-4 inline-block px-4 py-2 rounded-xl cyber-btn-blue font-bold text-xs glow-blue">
            Back to Assignments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <Link
        href="/assignments"
        className="inline-flex items-center gap-1.5 text-xs text-[#9AA6B5] hover:text-[#F5F7FA] mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-[#168BFF]" /> Back to Assignments
      </Link>

      {/* Assignment Header Card */}
      <div className="cyber-card p-8 rounded-2xl shadow-2xl relative overflow-hidden glow-blue">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#168BFF] to-transparent" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1C2330]">
          <div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30 font-mono">
              {assignment.class_name || "Enrolled Class"}
            </span>
            <h1 className="text-2xl font-extrabold text-[#F5F7FA] mt-2">{assignment.title}</h1>
            <p className="text-xs text-[#9AA6B5] mt-1">{assignment.description || "Complete all problems."}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-right shrink-0">
            <p className="text-[10px] text-[#5F6B7C] uppercase font-semibold">Your Total Score</p>
            <p className="text-2xl font-extrabold font-mono text-emerald-400 mt-0.5">
              {assignment.user_total_score || 0} pts
            </p>
            <p className="text-[10px] text-[#FFD978] font-mono mt-1">
              Due: {new Date(assignment.due_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Problem List in Assignment */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider mb-4">
            Assigned Problems ({assignment.problems?.length || 0})
          </h3>

          <div className="space-y-3">
            {assignment.problems?.map((ap: any, idx: number) => {
              const isSubmitted = ap.status && ap.status !== "Unsolved";
              const isEvaluated = ap.status === "Evaluated" || ap.status === "Solved" || (ap.marks !== null && ap.marks !== undefined);
              const isSolved = ap.solved || ap.status === "Solved";

              return (
                <div
                  key={ap.problem_id}
                  className="p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] hover:border-[#168BFF]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#10151D] text-[#36C5FF] border border-[#1C2330] flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5 sm:mt-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F7FA]">{ap.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            ap.difficulty === "Easy"
                              ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                              : ap.difficulty === "Medium"
                              ? "text-[#FFD978] bg-[#F5BD45]/10 border border-[#F5BD45]/30"
                              : "text-red-400 bg-red-500/10 border border-red-500/30"
                          }`}
                        >
                          {ap.difficulty}
                        </span>
                        <span className="text-[11px] text-[#5F6B7C] font-mono">{ap.points} pts max</span>
                        {ap.teacher_feedback && (
                          <span className="text-[10px] text-[#FFD978] bg-[#F5BD45]/10 border border-[#F5BD45]/30 px-2 py-0.5 rounded italic">
                            Feedback: &quot;{ap.teacher_feedback.length > 40 ? ap.teacher_feedback.slice(0, 40) + '...' : ap.teacher_feedback}&quot;
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    {isSolved ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-mono">
                        <CheckCircle2 className="w-4 h-4" /> Solved ({ap.best_score ?? ap.points} pts)
                      </span>
                    ) : isEvaluated ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#FFD978] font-mono">
                        <Trophy className="w-4 h-4 text-[#F5BD45]" /> Evaluated ({ap.best_score ?? 0} / {ap.points} pts)
                      </span>
                    ) : ap.status === "Under Review" ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 font-mono">
                        <Clock className="w-4 h-4" /> Under Review
                      </span>
                    ) : ap.status === "Submitted" ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-[#36C5FF] font-mono">
                        <Clock className="w-4 h-4" /> Submitted (Pending)
                      </span>
                    ) : (
                      <span className="text-xs text-[#5F6B7C] font-mono">Unsolved (0 pts)</span>
                    )}

                    <Link
                      href={`/problems/${ap.slug}?assignment_id=${assignment.id}${isSubmitted ? '&tab=submissions' : ''}`}
                      className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
                        isSubmitted
                          ? "bg-[#161D28] text-[#F5F7FA] hover:bg-[#1C2433] border border-[#1C2330]"
                          : "bg-[#10151D] hover:bg-[#168BFF] hover:text-[#050608] text-[#36C5FF] border border-[#168BFF]/30"
                      }`}
                    >
                      {isSubmitted ? "View Submission" : "Solve Problem"} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
