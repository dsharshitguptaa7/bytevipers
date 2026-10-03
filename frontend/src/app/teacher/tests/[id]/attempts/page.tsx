"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Users, ArrowLeft, Search, Filter, CheckCircle2, Clock,
  Eye, Loader2, Award, FileQuestion
} from "lucide-react";

export default function TeacherTestAttemptsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const testId = Number(resolvedParams.id);

  const [test, setTest] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [testData, attemptsData] = await Promise.all([
        api.getTeacherTest(testId),
        api.listTeacherTestAttempts(testId, {
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        }),
      ]);
      setTest(testData);
      setAttempts(attemptsData);
    } catch (err) {
      console.error("Failed to load attempts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [testId, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "EVALUATED":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "SUBMITTED":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      case "IN_PROGRESS":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "EXPIRED":
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link href="/teacher/tests" className="inline-flex items-center gap-1.5 text-xs text-[#9AA6B5] hover:text-[#F5F7FA] transition-colors">
        <ArrowLeft className="w-4 h-4 text-[#F5BD45]" /> Back to Tests
      </Link>

      {/* Header */}
      <div className="pb-6 border-b border-[#1C2330] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 uppercase tracking-wider">
              Super Admin Assessment Grading
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F5F7FA]">
            Candidate Attempts & Grading: {test?.title || "Assessment"}
          </h1>
          <p className="text-xs text-[#9AA6B5] mt-1">
            Review candidate answer sheets, evaluate questions, award marks, and publish report cards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#0B0E14] border border-[#1C2330] text-[#168BFF]">
            {attempts.length} Total Candidates
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F6B7C]" />
          <input
            type="text"
            placeholder="Search by candidate name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#F5BD45]"
        >
          <option value="">All Attempt Statuses</option>
          <option value="SUBMITTED">Submitted (Needs Grading)</option>
          <option value="EVALUATED">Evaluated (Draft)</option>
          <option value="PUBLISHED">Published</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="cyber-card rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 flex items-center justify-center text-[#9AA6B5]">
            <Loader2 className="w-6 h-6 animate-spin text-[#F5BD45] mr-2" />
            <span className="text-xs">Loading candidate responses...</span>
          </div>
        ) : attempts.length === 0 ? (
          <div className="p-16 text-center text-[#9AA6B5]">
            <Users className="w-10 h-10 mx-auto text-[#5F6B7C] mb-2" />
            <h3 className="text-sm font-bold text-[#F5F7FA]">No Attempts Found</h3>
            <p className="text-xs text-[#5F6B7C] mt-1">Student attempts for this assessment will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0E14] text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                <tr>
                  <th className="py-3 px-6">Candidate</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Score</th>
                  <th className="py-3 px-6">Started</th>
                  <th className="py-3 px-6 text-right">Submitted</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2330]">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-[#161D28]/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-[#F5F7FA]">{att.student_name}</div>
                      <div className="text-[11px] text-[#5F6B7C]">{att.student_email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(att.status)}`}>
                        {att.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono">
                      {att.total_score !== null && att.total_score !== undefined ? (
                        <span className="font-bold text-emerald-400">
                          {att.total_score} / {att.max_score}
                        </span>
                      ) : (
                        <span className="text-[#5F6B7C]">Pending</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-[#5F6B7C]">
                      {att.started_at ? new Date(att.started_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-4 px-6 text-right text-[#5F6B7C]">
                      {att.submitted_at ? new Date(att.submitted_at).toLocaleString() : "Active / Ongoing"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/teacher/tests/attempts/${att.id}/evaluate`}
                        className="px-3 py-1.5 rounded-lg bg-[#0B0E14] text-[#FFD978] border border-[#F5BD45]/30 hover:bg-[#F5BD45] hover:text-[#050608] transition-all font-semibold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Grade Answer Sheet
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
