"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  BookOpen, Clock, Users, ArrowLeft, Loader2, AlertCircle,
  CheckCircle2, Globe, Lock, Terminal
} from "lucide-react";

export default function TeacherAssignmentResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = parseInt(resolvedParams.id, 10);

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getTeacherAssignment(assignmentId);
      setAssignment(data);
    } catch (err: any) {
      setError(err.message || "Failed to load assignment details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-[#9AA6B5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5BD45] mb-2" />
        <span className="ml-3 text-sm">Loading assignment results...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/teacher/assignments"
        className="inline-flex items-center gap-1.5 text-xs text-[#9AA6B5] hover:text-[#F5BD45] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Assignments
      </Link>

      <div className="p-8 rounded-2xl cyber-card border border-[#1C2330] shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#1C2330] gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#10151D] border border-[#F5BD45]/30 text-[#F5BD45] text-xs font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{assignment?.class_name || "Assigned Cohort"}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#F5F7FA] mt-1">{assignment?.title}</h1>
            <p className="text-xs text-[#9AA6B5] mt-1">{assignment?.description}</p>
          </div>

          <div className="text-right text-xs text-[#5F6B7C] font-mono">
            <p>Due: {new Date(assignment?.due_date).toLocaleDateString()}</p>
            <p className="mt-1 text-[#36C5FF] font-bold">
              {assignment?.submissions?.length || 0} student submissions
            </p>
          </div>
        </div>

        {/* Problems In Assignment */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider mb-4">
            Attached Problems ({assignment?.problems?.length || 0})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assignment?.problems?.map((p: any) => (
              <div key={p.problem_id} className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-[#F5F7FA]">{p.title}</h4>
                  <span className="text-[10px] text-[#5F6B7C] capitalize">{p.difficulty}</span>
                </div>
                <span className="font-mono text-[#F5BD45] font-bold">{p.points} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Submissions & Scores Table */}
        <div className="mt-8 pt-6 border-t border-[#1C2330]">
          <h3 className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider mb-4">
            Student Evaluation Results ({assignment?.submissions?.length || 0})
          </h3>

          {assignment?.submissions?.length === 0 ? (
            <p className="text-xs text-[#5F6B7C]">No submissions recorded yet for this assignment.</p>
          ) : (
            <div className="rounded-xl bg-[#0B0E14] border border-[#1C2330] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050608] text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Problem ID</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Attempt</th>
                    <th className="py-3 px-4 text-right">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C2330]">
                  {assignment.submissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-[#161D28]/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#F5F7FA]">
                        {sub.student_name}
                        <span className="text-[10px] text-[#5F6B7C] block">{sub.student_email}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#9AA6B5]">Problem #{sub.problem_id}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#F5BD45]">{sub.score} pts</td>
                      <td className="py-3 px-4 font-mono text-[#5F6B7C]">#{sub.attempt_number}</td>
                      <td className="py-3 px-4 text-right text-[#5F6B7C]">
                        {new Date(sub.submitted_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
