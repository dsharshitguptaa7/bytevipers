"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  School, Plus, Users, Key, ArrowRight, Loader2,
  AlertCircle, CheckCircle2, Copy
} from "lucide-react";

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const data = await api.listTeacherClasses();
      setClasses(data);
    } catch (err: any) {
      setError(err.message || "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      await api.createClass({
        name: newClassName.trim(),
        description: newClassDesc.trim() || undefined,
      });
      setNewClassName("");
      setNewClassDesc("");
      await loadClasses();
    } catch (err: any) {
      setError(err.message || "Failed to create class.");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#1C2330]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 uppercase tracking-wider">
            Super Admin Cohort Management
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Classes & Student Cohorts</h1>
        <p className="text-xs text-[#9AA6B5] mt-1">
          Create student cohorts, distribute enrollment keys, and track class participation.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Create Class Card */}
      <div className="cyber-card p-6 rounded-2xl shadow-xl glow-gold">
        <h2 className="text-sm font-bold text-[#F5F7FA] mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#F5BD45]" /> Create New Class Cohort
        </h2>

        <form onSubmit={handleCreateClass} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#9AA6B5] uppercase mb-1">Class Name *</label>
            <input
              type="text"
              required
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. CS101: Intro to Python Algorithms"
              className="w-full px-3.5 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#9AA6B5] uppercase mb-1">Description / Semester</label>
            <input
              type="text"
              value={newClassDesc}
              onChange={(e) => setNewClassDesc(e.target.value)}
              placeholder="Fall 2026 Batch A"
              className="w-full px-3.5 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="cyber-btn-gold w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 glow-gold"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create Class & Generate Code
            </button>
          </div>
        </form>
      </div>

      {/* Classes Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-2">
          <School className="w-4 h-4 text-[#F5BD45]" /> Active Classes ({classes.length})
        </h2>

        {loading ? (
          <div className="p-16 flex items-center justify-center text-[#9AA6B5]">
            <Loader2 className="w-6 h-6 animate-spin text-[#F5BD45] mr-2" />
            <span className="text-xs">Loading classes...</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="p-16 rounded-2xl cyber-card text-center text-[#9AA6B5]">
            <School className="w-10 h-10 mx-auto text-[#5F6B7C] mb-2" />
            <h3 className="text-sm font-bold text-[#F5F7FA]">No Classes Created</h3>
            <p className="text-xs text-[#5F6B7C] mt-1">Create a class above to generate an enrollment code for students.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((c) => (
              <div
                key={c.id}
                className="cyber-card p-6 rounded-2xl hover:border-[#F5BD45]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0B0E14] text-[#36C5FF] border border-[#1C2330]">
                      {c.member_count} enrolled
                    </span>
                    <button
                      onClick={() => copyToClipboard(c.code)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0E14] text-xs font-mono font-bold text-[#FFD978] border border-[#F5BD45]/30 hover:bg-[#F5BD45]/20 transition-colors"
                      title="Click to copy enrollment code"
                    >
                      <Key className="w-3.5 h-3.5 text-[#F5BD45]" />
                      <span>{c.code}</span>
                      {copiedCode === c.code ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-[#F5F7FA] mt-4">{c.name}</h3>
                  <p className="text-xs text-[#9AA6B5] mt-1.5 line-clamp-2">{c.description || "No description provided."}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#1C2330] flex items-center justify-between">
                  <span className="text-[11px] text-[#5F6B7C]">Created {new Date(c.created_at).toLocaleDateString()}</span>
                  <Link
                    href={`/teacher/classes/${c.id}`}
                    className="text-xs font-bold text-[#FFD978] hover:underline flex items-center gap-1"
                  >
                    Manage Roster <ArrowRight className="w-3 h-3 text-[#F5BD45]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
