"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  FileQuestion, Clock, Award, Calendar, CheckCircle2,
  ChevronRight, AlertCircle, Loader2, Play, BookOpen
} from "lucide-react";

export default function StudentTestsPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTests() {
      try {
        const data = await api.listAvailableTests();
        setTests(data);
      } catch (err) {
        console.error("Failed to load online tests:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTests();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 bg-[#050608]">
      {/* Header */}
      <div className="pb-6 border-b border-[#1C2330]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-mono font-bold text-[#FFD978] uppercase tracking-wider">ByteVipers Arena</span>
          <span className="text-[#5F6B7C]">•</span>
          <span className="text-xs font-mono text-[#36C5FF]">Class Assessments</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F7FA]">Online Coding &amp; Theory Tests</h1>
        <p className="text-xs sm:text-sm text-[#9AA6B5] mt-1">
          Take scheduled online assessments, coding challenges, and theory tests assigned by your instructors.
        </p>
      </div>

      {loading ? (
        <div className="p-16 flex items-center justify-center text-[#9AA6B5]">
          <Loader2 className="w-6 h-6 animate-spin text-[#36C5FF] mr-2" />
          <span className="text-xs font-mono">Loading available tests...</span>
        </div>
      ) : tests.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-[#10151D] border border-[#1C2330]">
          <FileQuestion className="w-12 h-12 mx-auto text-[#5F6B7C] mb-3" />
          <h3 className="text-base font-bold text-[#F5F7FA]">No Tests Available</h3>
          <p className="text-xs text-[#9AA6B5] mt-1 max-w-sm mx-auto">
            There are currently no published online tests available for your enrolled classes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((test) => {
            const hasStarted = !!test.my_attempt;
            const attemptStatus = test.my_attempt?.status;
            const isCompleted = attemptStatus === "SUBMITTED" || attemptStatus === "EVALUATED" || attemptStatus === "PUBLISHED" || attemptStatus === "EXPIRED";

            return (
              <div
                key={test.id}
                className="p-5 rounded-2xl cyber-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30">
                      {test.status}
                    </span>
                    {attemptStatus && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          attemptStatus === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : attemptStatus === "IN_PROGRESS"
                            ? "bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30"
                            : "bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30"
                        }`}
                      >
                        {attemptStatus === "IN_PROGRESS" ? "In Progress" : attemptStatus}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#F5F7FA] mt-3">{test.title}</h3>
                  <p className="text-xs text-[#9AA6B5] line-clamp-2 mt-1">
                    {test.description || "No description provided."}
                  </p>

                  {/* Meta items */}
                  <div className="mt-4 pt-4 border-t border-[#1C2330] grid grid-cols-3 gap-2 text-xs font-mono text-[#F5F7FA]/90">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#36C5FF]" />
                      <span>{test.duration_minutes} mins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#FFD978]" />
                      <span>{test.total_marks} pts</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#36C5FF]" />
                      <span>{test.question_count || 0} questions</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3">
                  {isCompleted ? (
                    <Link
                      href={`/tests/${test.id}/result`}
                      className="w-full py-2.5 rounded-xl bg-[#161D28] hover:bg-[#1C2433] text-xs font-bold text-[#36C5FF] border border-[#168BFF]/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      View Test Results &amp; Feedback
                    </Link>
                  ) : attemptStatus === "IN_PROGRESS" ? (
                    <Link
                      href={`/tests/${test.id}/attempt`}
                      className="w-full py-2.5 rounded-xl bg-[#F5BD45]/15 hover:bg-[#F5BD45]/25 text-xs font-bold text-[#FFD978] border border-[#F5BD45]/40 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(245,189,69,0.15)]"
                    >
                      <Play className="w-4 h-4 text-[#FFD978]" />
                      Resume Ongoing Test
                    </Link>
                  ) : (
                    <Link
                      href={`/tests/${test.id}`}
                      className="w-full py-2.5 rounded-xl cyber-btn-blue text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(22,139,255,0.3)]"
                    >
                      <span>Instructions &amp; Start Test</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
