"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, ShieldCheck, Code2, School, BookOpen,
  FileCode2, Users, ShieldAlert, FileText, Settings, ArrowLeft, Loader2
} from "lucide-react";
import ByteVipersLogo from "@/components/ByteVipersLogo";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, hasPermission } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "teacher") {
        router.push("/problems");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#94A3B8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5B942] mb-2" />
        <span className="ml-3 text-sm">Authenticating Teacher Dashboard...</span>
      </div>
    );
  }

  if (!user || user.role !== "teacher") {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-center text-[#94A3B8]">
        <div>
          <ShieldAlert className="w-12 h-12 mx-auto text-red-400 mb-3" />
          <h2 className="text-xl font-bold text-[#F8FAFC]">Teacher Access Required</h2>
          <p className="text-xs mt-1">This unified management dashboard requires instructor authorization.</p>
          <Link href="/login" className="mt-4 inline-block px-4 py-2 rounded-xl bg-[#38BDF8] text-[#0B1020] font-bold text-xs">
            Sign In with Teacher Credentials
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === "/teacher") return pathname === "/teacher";
    return pathname.startsWith(path);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-[#1C2330] bg-[#0B0E14] p-4 flex flex-col shrink-0">
        <div className="px-3 py-2.5 mb-4 border-b border-[#1C2330]">
          <div className="flex items-center gap-2.5 mb-2">
            <ByteVipersLogo size={28} showText={false} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F5BD45] animate-pulse" />
                <span className="text-[11px] font-mono font-bold uppercase text-[#FFD978] tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-[10px] text-[#5F6B7C]">Instructor Portal</p>
            </div>
          </div>
          <p className="text-xs font-bold text-[#F5F7FA] truncate">{user.full_name}</p>
        </div>

        <nav className="flex-1 space-y-1 text-xs">
          {/* Overview */}
          <Link
            href="/teacher"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-colors ${
              isActive("/teacher")
                ? "bg-[#10151D] text-[#FFD978] border border-[#F5BD45]/40 shadow-[0_0_12px_rgba(245,189,69,0.12)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#F5BD45]" /> Overview
          </Link>

          {/* Student Verifications */}
          <Link
            href="/teacher/verifications"
            className={`flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-colors ${
              isActive("/teacher/verifications")
                ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#36C5FF]" /> Verifications
            </span>
          </Link>

          {/* Problem Management */}
          <Link
            href="/teacher/problems"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-colors ${
              isActive("/teacher/problems")
                ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            <Code2 className="w-4 h-4 text-[#36C5FF]" /> Problem Management
          </Link>

          {/* Online Tests */}
          <Link
            href="/teacher/tests"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-colors ${
              isActive("/teacher/tests")
                ? "bg-[#10151D] text-[#FFD978] border border-[#F5BD45]/40 shadow-[0_0_12px_rgba(245,189,69,0.12)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            <FileText className="w-4 h-4 text-[#FFD978]" /> Online Tests &amp; Grading
          </Link>

          {/* Classes */}
          <Link
            href="/teacher/classes"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-colors ${
              isActive("/teacher/classes")
                ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            <School className="w-4 h-4 text-[#36C5FF]" /> Classes &amp; Students
          </Link>

          {/* Assignments */}
          <Link
            href="/teacher/assignments"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-colors ${
              isActive("/teacher/assignments")
                ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#36C5FF]" /> Assignments
          </Link>

          {/* Submission Review */}
          <Link
            href="/teacher/submissions"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-colors ${
              isActive("/teacher/submissions")
                ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            <FileCode2 className="w-4 h-4 text-[#36C5FF]" /> Code Submissions
          </Link>

          {/* Platform Controls Header */}
          <div className="pt-4 pb-1">
            <span className="px-3 text-[10px] font-mono font-semibold text-[#5F6B7C] uppercase tracking-wider block">
              Elevated Controls
            </span>
          </div>

          {/* Student Coordinators (Super Admin) */}
          <Link
            href="/teacher/coordinators"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-colors ${
              isActive("/teacher/coordinators")
                ? "bg-[#10151D] text-[#FFD978] border border-[#F5BD45]/40 shadow-[0_0_12px_rgba(245,189,69,0.15)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#FFD978]" /> Student Coordinators
          </Link>

          {/* User Management */}
          <Link
            href="/teacher/users"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-colors ${
              isActive("/teacher/users")
                ? "bg-[#10151D] text-[#FFD978] border border-[#F5BD45]/40 shadow-[0_0_12px_rgba(245,189,69,0.12)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            <Users className="w-4 h-4 text-[#FFD978]" /> Users &amp; Permissions
          </Link>

          {/* Audit Logs */}
          <Link
            href="/teacher/audit-logs"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-colors ${
              isActive("/teacher/audit-logs")
                ? "bg-[#10151D] text-[#FFD978] border border-[#F5BD45]/40 shadow-[0_0_12px_rgba(245,189,69,0.12)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            <FileText className="w-4 h-4 text-[#FFD978]" /> Platform Audit Logs
          </Link>
        </nav>

        <div className="pt-4 border-t border-[#1C2330]">
          <Link
            href="/problems"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#5F6B7C] hover:text-[#F5F7FA] hover:bg-[#10151D] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Arena
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#050608]">
        {children}
      </main>
    </div>
  );
}
