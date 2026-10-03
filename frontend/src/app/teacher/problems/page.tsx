"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Code2, Plus, Search, Edit3, Trash2, Globe, Lock,
  Loader2, CheckCircle2, AlertCircle, RefreshCw
} from "lucide-react";

export default function TeacherProblemsPage() {
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const loadProblems = async () => {
    setLoading(true);
    try {
      const data = await api.listTeacherProblems({
        search: search || undefined,
        status_filter: statusFilter || undefined,
      });
      setProblems(data);
    } catch (err) {
      console.error("Failed to load problems:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadProblems, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleTogglePublish = async (id: number) => {
    setActionError(null);
    try {
      await api.toggleProblemPublish(id);
      await loadProblems();
    } catch (err: any) {
      setActionError(err.message || "Failed to toggle problem publication status.");
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (window.confirm(`Are you sure you want to delete problem "${title}"? This cannot be undone.`)) {
      try {
        await api.deleteProblem(id);
        await loadProblems();
      } catch (err: any) {
        setActionError(err.message || "Failed to delete problem.");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#1C2330] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 uppercase tracking-wider">
              Super Admin Problem Authoring
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Problem Management</h1>
          <p className="text-xs text-[#9AA6B5] mt-1">
            Author and configure Python challenges, public samples, and secret hidden evaluation tests.
          </p>
        </div>

        <Link
          href="/teacher/problems/new"
          className="cyber-btn-gold px-4 py-2.5 rounded-xl text-xs font-bold glow-gold flex items-center gap-1.5 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Create New Problem
        </Link>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems by title..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
          />
          <Search className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#F5BD45]"
          >
            <option value="">All Publication States</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {/* Problems Table */}
      <div className="cyber-card rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 flex items-center justify-center text-[#9AA6B5]">
            <Loader2 className="w-6 h-6 animate-spin text-[#F5BD45] mr-2" />
            <span className="text-xs">Loading problems...</span>
          </div>
        ) : problems.length === 0 ? (
          <div className="p-16 text-center text-[#9AA6B5]">
            <Code2 className="w-10 h-10 mx-auto text-[#5F6B7C] mb-2" />
            <h3 className="text-sm font-bold text-[#F5F7FA]">No Problems Found</h3>
            <p className="text-xs text-[#5F6B7C] mt-1">Get started by creating your first Python challenge.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0E14] text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                <tr>
                  <th className="py-3 px-6">Title</th>
                  <th className="py-3 px-6">Difficulty</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Limits</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2330]">
                {problems.map((p) => (
                  <tr key={p.id} className="hover:bg-[#161D28]/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-[#F5F7FA]">
                      <Link href={`/problems/${p.slug}`} className="hover:text-[#36C5FF] transition-colors">
                        {p.title}
                      </Link>
                      <span className="text-[10px] text-[#5F6B7C] block font-mono">/{p.slug}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          p.difficulty === "Easy"
                            ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                            : p.difficulty === "Medium"
                            ? "text-[#FFD978] bg-[#F5BD45]/10 border border-[#F5BD45]/20"
                            : "text-red-400 bg-red-500/10 border border-red-500/20"
                        }`}
                      >
                        {p.difficulty}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {p.is_published ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                          <Globe className="w-3.5 h-3.5" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#FFD978] text-xs font-semibold">
                          <Lock className="w-3.5 h-3.5" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-mono text-[#5F6B7C]">
                      {p.time_limit_ms}ms / {p.memory_limit_mb}MB
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleTogglePublish(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          p.is_published
                            ? "bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 hover:bg-[#F5BD45]/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                        }`}
                      >
                        {p.is_published ? "Unpublish" : "Publish"}
                      </button>

                      <Link
                        href={`/teacher/problems/${p.id}/edit`}
                        className="px-3 py-1.5 rounded-lg bg-[#0B0E14] text-[#36C5FF] border border-[#168BFF]/30 hover:bg-[#168BFF] hover:text-[#050608] transition-all font-semibold inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </Link>

                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete problem"
                      >
                        <Trash2 className="w-4 h-4" />
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
