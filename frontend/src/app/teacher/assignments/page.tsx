"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  BookOpen, Plus, Globe, Lock, Clock, ArrowRight,
  Loader2, AlertCircle, CheckCircle2, Users
} from "lucide-react";

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await api.listTeacherAssignments();
      setAssignments(data);
    } catch (err: any) {
      setActionError(err.message || "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const handleTogglePublish = async (id: number) => {
    setActionError(null);
    try {
      await api.toggleAssignmentPublish(id);
      await loadAssignments();
    } catch (err: any) {
      setActionError(err.message || "Failed to toggle assignment publication status.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#1C2330] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 uppercase tracking-wider">
              Super Admin Coursework
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Assignment Management</h1>
          <p className="text-xs text-[#9AA6B5] mt-1">
            Author and assign Python problem sets with automated scoring and deadlines.
          </p>
        </div>

        <Link
          href="/teacher/assignments/new"
          className="cyber-btn-gold px-4 py-2.5 rounded-xl text-xs font-bold glow-gold flex items-center gap-1.5 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Create Assignment
        </Link>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Assignments Table */}
      <div className="cyber-card rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 flex items-center justify-center text-[#9AA6B5]">
            <Loader2 className="w-6 h-6 animate-spin text-[#F5BD45] mr-2" />
            <span className="text-xs">Loading assignments...</span>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-16 text-center text-[#9AA6B5]">
            <BookOpen className="w-10 h-10 mx-auto text-[#5F6B7C] mb-2" />
            <h3 className="text-sm font-bold text-[#F5F7FA]">No Assignments Created</h3>
            <p className="text-xs text-[#5F6B7C] mt-1">Click &quot;Create Assignment&quot; to assign Python challenges to your class.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0E14] text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                <tr>
                  <th className="py-3 px-6">Assignment Title</th>
                  <th className="py-3 px-6">Target Class</th>
                  <th className="py-3 px-6">Problems & Points</th>
                  <th className="py-3 px-6">Submissions</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2330]">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-[#161D28]/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-[#F5F7FA]">
                      <Link href={`/teacher/assignments/${a.id}`} className="hover:text-[#36C5FF] transition-colors">
                        {a.title}
                      </Link>
                      <span className="text-[10px] text-[#5F6B7C] block font-mono">
                        Due: {new Date(a.due_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[#9AA6B5] font-semibold">{a.class_name || "General"}</td>
                    <td className="py-4 px-6 font-mono text-[#9AA6B5]">
                      {a.problems_count} problems • {a.total_points} pts
                    </td>
                    <td className="py-4 px-6 font-mono text-[#F5F7FA]">{a.submissions_count} submitted</td>
                    <td className="py-4 px-6">
                      {a.is_published ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <Globe className="w-3.5 h-3.5" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#FFD978] font-semibold">
                          <Lock className="w-3.5 h-3.5" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleTogglePublish(a.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          a.is_published
                            ? "bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 hover:bg-[#F5BD45]/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                        }`}
                      >
                        {a.is_published ? "Unpublish" : "Publish"}
                      </button>

                      <Link
                        href={`/teacher/assignments/${a.id}`}
                        className="px-3 py-1.5 rounded-lg bg-[#0B0E14] text-[#36C5FF] border border-[#168BFF]/30 hover:bg-[#168BFF] hover:text-[#050608] transition-all font-semibold inline-flex items-center gap-1"
                      >
                        Results & Review <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
