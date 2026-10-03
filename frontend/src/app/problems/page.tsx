"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Search, Filter, CheckCircle2, Clock, Code2, Tag as TagIcon,
  ChevronRight, ArrowUpDown, Loader2, AlertCircle
} from "lucide-react";

export default function ProblemLibraryPage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [probs, allTags] = await Promise.all([
          api.listProblems({
            search: search || undefined,
            difficulty: difficulty || undefined,
            tag: selectedTag || undefined,
          }),
          api.listTags(),
        ]);
        setProblems(probs);
        setTags(allTags);
      } catch (err) {
        console.error("Failed to load problem library:", err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadData, 200);
    return () => clearTimeout(timer);
  }, [search, difficulty, selectedTag]);

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full bg-[#050608]">
      {/* Title & Tagline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-[#1C2330] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#36C5FF] uppercase tracking-wider">ByteVipers Arena</span>
            <span className="text-[#5F6B7C]">•</span>
            <span className="text-xs font-mono font-bold text-[#FFD978]">Python Only</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#F5F7FA]">Problem Library</h1>
          <p className="text-sm text-[#9AA6B5] mt-1">
            Browse and conquer algorithmic challenges curated for Python developers.
          </p>
        </div>

        {/* Verification banner if student not approved */}
        {user && user.role === "student" && (user.verification_status || "").toLowerCase() !== "approved" && (
          <div className="p-3.5 rounded-xl bg-[#F5BD45]/10 border border-[#F5BD45]/30 text-xs text-[#FFD978] flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 text-[#F5BD45]" />
            <div>
              <p className="font-semibold">
                {(user.verification_status || "").toLowerCase() === "pending"
                  ? "Verification Pending"
                  : (user.verification_status || "").toLowerCase() === "rejected"
                  ? "Verification Rejected"
                  : "Not Verified"}
              </p>
              <Link href="/verify-student" className="underline hover:text-[#FFD978]">
                {(user.verification_status || "").toLowerCase() === "pending"
                  ? "Check status to unlock arena"
                  : "Complete verification to unlock arena"}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems by title..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] focus:shadow-[0_0_12px_rgba(22,139,255,0.25)] transition-all"
          />
          <Search className="w-4 h-4 text-[#5F6B7C] absolute left-3.5 top-3" />
        </div>

        {/* Difficulty Filter */}
        <div className="w-full sm:w-48">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] focus:outline-none focus:border-[#168BFF] transition-colors"
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {/* Tag Filter */}
        <div className="w-full sm:w-56">
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-sm text-[#F5F7FA] focus:outline-none focus:border-[#168BFF] transition-colors"
          >
            <option value="">All Topics</option>
            {tags.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Problem Table / List */}
      <div className="mt-6 rounded-2xl bg-[#10151D] border border-[#1C2330] shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-[#9AA6B5]">
            <Loader2 className="w-8 h-8 animate-spin text-[#36C5FF] mb-3" />
            <p className="text-xs font-mono">Loading problem arena...</p>
          </div>
        ) : problems.length === 0 ? (
          <div className="p-16 text-center text-[#9AA6B5]">
            <Code2 className="w-10 h-10 mx-auto text-[#5F6B7C] mb-3" />
            <h3 className="text-base font-bold text-[#F5F7FA]">No Problems Found</h3>
            <p className="text-xs mt-1 text-[#5F6B7C]">Try adjusting your search query or topic filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0B0E14] text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                <tr>
                  <th className="py-3.5 px-6 w-16">Status</th>
                  <th className="py-3.5 px-6">Title</th>
                  <th className="py-3.5 px-6">Difficulty</th>
                  <th className="py-3.5 px-6">Topics</th>
                  <th className="py-3.5 px-6 text-right">Limits</th>
                  <th className="py-3.5 px-6 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2330]">
                {problems.map((prob) => (
                  <tr
                    key={prob.id}
                    className="hover:bg-[#161D28]/60 transition-colors group cursor-pointer"
                  >
                    {/* Solved Status */}
                    <td className="py-4 px-6 text-center">
                      {prob.solved_status === "SOLVED" ? (
                        <span title="Solved" className="inline-flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </span>
                      ) : prob.solved_status === "ATTEMPTED" ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FFD978] inline-block" title="Attempted" />
                      ) : (
                        <span className="text-[#5F6B7C] text-xs">—</span>
                      )}
                    </td>

                    {/* Title */}
                    <td className="py-4 px-6">
                      <Link
                        href={`/problems/${prob.slug}`}
                        className="font-bold text-[#F5F7FA] group-hover:text-[#36C5FF] transition-colors"
                      >
                        {prob.title}
                      </Link>
                    </td>

                    {/* Difficulty */}
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          prob.difficulty === "Easy"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : prob.difficulty === "Medium"
                            ? "bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {prob.difficulty}
                      </span>
                    </td>

                    {/* Tags */}
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5">
                        {prob.tags?.map((t: any) => (
                          <span
                            key={t.id}
                            className="text-[11px] px-2 py-0.5 rounded bg-[#0B0E14] text-[#9AA6B5] border border-[#1C2330]"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Time limit */}
                    <td className="py-4 px-6 text-right font-mono text-xs text-[#5F6B7C]">
                      {prob.time_limit_ms}ms / {prob.memory_limit_mb}MB
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right">
                      <Link href={`/problems/${prob.slug}`}>
                        <ChevronRight className="w-4 h-4 text-[#5F6B7C] group-hover:text-[#36C5FF] transition-colors inline" />
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
