"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Users, ShieldCheck, Code2, BookOpen, FileCode2, Clock,
  ArrowRight, CheckCircle2, XCircle, AlertCircle, Loader2, Sparkles
} from "lucide-react";

export default function TeacherOverviewPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getTeacherOverview();
        setOverview(data);
      } catch (err) {
        console.error("Failed to load teacher stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-[#94A3B8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5B942] mb-2" />
        <span className="ml-3 text-sm">Loading Instructor Overview...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="p-8 rounded-2xl bg-gradient-to-r from-[#10151D] via-[#161D28] to-[#0B0E14] border border-[#222B3B] shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
        <div className="absolute top-0 left-1/4 w-32 h-1 bg-gradient-to-r from-transparent via-[#F5BD45] to-transparent rounded-full" />

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5BD45]/10 border border-[#F5BD45]/30 text-[#FFD978] text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F5BD45]" /> Unified Management Arena
          </div>
          <h1 className="text-3xl font-extrabold text-[#F5F7FA]">Instructor &amp; Super Admin Dashboard</h1>
          <p className="text-xs text-[#9AA6B5] mt-1 max-w-xl leading-relaxed">
            Centralized management for coordinator governance, student verifications, problem authoring, and online assessments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/teacher/verifications"
            className="px-4 py-2.5 rounded-xl cyber-btn-gold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,189,69,0.25)]"
          >
            Review Verifications <ArrowRight className="w-3.5 h-3.5 text-[#050608]" />
          </Link>
          <Link
            href="/teacher/coordinators"
            className="px-4 py-2.5 rounded-xl bg-[#10151D] border border-[#F5BD45]/50 text-[#FFD978] font-bold text-xs hover:bg-[#F5BD45]/10 transition-all flex items-center gap-1.5"
          >
            Manage Coordinators <ShieldCheck className="w-3.5 h-3.5 text-[#F5BD45]" />
          </Link>
          <Link
            href="/teacher/problems/new"
            className="px-4 py-2.5 rounded-xl bg-[#10151D] border border-[#168BFF]/50 text-[#36C5FF] font-bold text-xs hover:bg-[#168BFF]/10 transition-all flex items-center gap-1.5"
          >
            Create Problem <Code2 className="w-3.5 h-3.5 text-[#36C5FF]" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl cyber-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider">Registered Students</span>
            <Users className="w-4 h-4 text-[#36C5FF]" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-[#F5F7FA] mt-3">
            {overview?.total_students || 0}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#5F6B7C]">
            <span className="text-emerald-400 font-semibold">{overview?.verified_students_count || 0} verified</span>
            <span>•</span>
            <span className="text-[#FFD978] font-semibold">{overview?.pending_verifications_count || 0} pending</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl cyber-card-gold">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider">Pending Verifications</span>
            <Clock className="w-4 h-4 text-[#FFD978]" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-[#FFD978] mt-3">
            {overview?.pending_verifications_count || 0}
          </p>
          <Link
            href="/teacher/verifications"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#36C5FF] hover:underline"
          >
            Review applications queue →
          </Link>
        </div>

        <div className="p-5 rounded-2xl cyber-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider">Arena Problems</span>
            <Code2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-[#F5F7FA] mt-3">
            {overview?.published_problems_count || 0}
          </p>
          <span className="mt-2 text-[11px] text-[#5F6B7C] block">
            {overview?.draft_problems_count || 0} drafts in authoring
          </span>
        </div>

        <div className="p-5 rounded-2xl cyber-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider">Platform Submissions</span>
            <FileCode2 className="w-4 h-4 text-[#36C5FF]" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-[#36C5FF] mt-3">
            {overview?.total_submissions_count || 0}
          </p>
          <Link
            href="/teacher/submissions"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#36C5FF] hover:underline"
          >
            Inspect submission logs →
          </Link>
        </div>
      </div>

      {/* Recent Platform Events / Audit Log Preview */}
      <div className="p-6 rounded-2xl cyber-card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#36C5FF]" /> Recent Administrative Events
          </h2>
          <Link href="/teacher/audit-logs" className="text-xs text-[#36C5FF] hover:underline">
            View Complete Audit Log
          </Link>
        </div>

        {overview?.recent_events?.length === 0 ? (
          <p className="text-xs text-[#5F6B7C]">No recent platform audit events.</p>
        ) : (
          <div className="divide-y divide-[#1C2330]">
            {overview?.recent_events?.map((ev: any) => (
              <div key={ev.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono text-[11px] font-bold text-[#36C5FF] px-2 py-0.5 rounded bg-[#0B0E14] border border-[#1C2330] mr-2">
                    {ev.action}
                  </span>
                  <span className="text-[#F5F7FA]">{ev.details || `${ev.entity_type} ID: ${ev.entity_id}`}</span>
                </div>
                <span className="text-[11px] text-[#5F6B7C] font-mono shrink-0 ml-4">
                  {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
