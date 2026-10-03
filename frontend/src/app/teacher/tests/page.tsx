"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  FileQuestion, Plus, Clock, Award, Users, Search,
  Edit, Trash2, CheckCircle2, ChevronRight, Loader2, Eye
} from "lucide-react";

export default function TeacherTestsPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadTests = async () => {
    setLoading(true);
    try {
      const data = await api.listTeacherTests({
        status_filter: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setTests(data);
    } catch (err) {
      console.error("Failed to load tests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTests();
  };

  const handleTogglePublish = async (testId: number) => {
    try {
      await api.publishTeacherTest(testId);
      await loadTests();
    } catch (err: any) {
      alert("Failed to toggle publish status: " + (err.message || "Unknown error"));
    }
  };

  const handleDeleteTest = async (testId: number) => {
    if (!window.confirm("Are you sure you want to delete this test? All associated questions and attempts will be removed.")) {
      return;
    }
    try {
      await api.deleteTeacherTest(testId);
      await loadTests();
    } catch (err: any) {
      alert("Failed to delete test: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-6 border-b border-[#1C2330] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 uppercase tracking-wider">
              Super Admin Assessment Control
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Online Test Management</h1>
          <p className="text-xs text-[#9AA6B5] mt-1">
            Create, schedule, monitor, and publish online exams with automated draft saving and manual evaluation.
          </p>
        </div>
        <Link
          href="/teacher/tests/new"
          className="cyber-btn-gold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 self-start md:self-auto transition-all glow-gold"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Test</span>
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F6B7C]" />
          <input
            type="text"
            placeholder="Search tests by title or description..."
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
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Tests Table */}
      <div className="cyber-card rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 flex items-center justify-center text-[#9AA6B5]">
            <Loader2 className="w-6 h-6 animate-spin text-[#F5BD45] mr-2" />
            <span className="text-xs">Loading tests...</span>
          </div>
        ) : tests.length === 0 ? (
          <div className="p-16 text-center text-[#9AA6B5]">
            <FileQuestion className="w-10 h-10 mx-auto text-[#5F6B7C] mb-2" />
            <h3 className="text-sm font-bold text-[#F5F7FA]">No Tests Created Yet</h3>
            <p className="text-xs text-[#5F6B7C] mt-1">Get started by creating your first scheduled assessment.</p>
            <Link
              href="/teacher/tests/new"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl cyber-btn-gold text-xs glow-gold"
            >
              <Plus className="w-4 h-4" /> Create Test
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0E14] text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                <tr>
                  <th className="py-3 px-6">Test Title</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Duration</th>
                  <th className="py-3 px-6">Marks</th>
                  <th className="py-3 px-6">Questions</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2330]">
                {tests.map((t) => (
                  <tr key={t.id} className="hover:bg-[#161D28]/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-[#F5F7FA]">{t.title}</div>
                      <div className="text-[11px] text-[#5F6B7C] line-clamp-1">{t.description || "No description"}</div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleTogglePublish(t.id)}
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold border transition-all ${
                          t.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-gray-500/20"
                        }`}
                        title="Click to toggle publish status"
                      >
                        {t.status}
                      </button>
                    </td>
                    <td className="py-4 px-6 font-mono text-[#9AA6B5]">
                      {t.duration_minutes} mins
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-[#FFD978]">
                      {t.total_marks} pts
                    </td>
                    <td className="py-4 px-6 font-mono text-[#168BFF]">
                      {t.questions?.length || 0} questions
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <Link
                        href={`/teacher/tests/${t.id}/attempts`}
                        className="px-3 py-1.5 rounded-lg bg-[#0B0E14] text-[#36C5FF] border border-[#168BFF]/30 hover:bg-[#168BFF] hover:text-[#050608] transition-all font-semibold inline-flex items-center gap-1"
                      >
                        <Users className="w-3.5 h-3.5" /> Attempts & Grading
                      </Link>

                      <Link
                        href={`/teacher/tests/${t.id}/edit`}
                        className="px-3 py-1.5 rounded-lg bg-[#0B0E14] text-[#9AA6B5] border border-[#1C2330] hover:text-[#F5F7FA] hover:bg-[#161D28] transition-all font-semibold inline-flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </Link>

                      <button
                        onClick={() => handleDeleteTest(t.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all inline-flex items-center"
                        title="Delete test"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
