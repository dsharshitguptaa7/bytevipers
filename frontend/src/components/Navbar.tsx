"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ByteVipersLogo } from "@/components/ByteVipersLogo";
import {
  Code2, LayoutDashboard, ShieldCheck, BookOpen, User, LogOut,
  Menu, X, Sparkles, Terminal, Users, CheckCircle, Clock, FileQuestion
} from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1C2330] bg-[#050608]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center">
          <ByteVipersLogo size={36} />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          <Link
            href="/problems"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              isActive("/problems")
                ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            Problems
          </Link>
          <Link
            href="/about"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              isActive("/about")
                ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
                : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
            }`}
          >
            About
          </Link>

          {user && user.role === "student" && (user.verification_status || "").toLowerCase() === "approved" && (
            <>
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive("/dashboard")
                    ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
                    : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/tests"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive("/tests")
                    ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
                    : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
                }`}
              >
                Online Tests
              </Link>
              <Link
                href="/assignments"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive("/assignments")
                    ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
                    : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
                }`}
              >
                Assignments
              </Link>
              <Link
                href="/submissions"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive("/submissions")
                    ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/40 shadow-[0_0_12px_rgba(22,139,255,0.15)]"
                    : "text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D]"
                }`}
              >
                Submissions
              </Link>
            </>
          )}

          {user && user.role === "teacher" && (
            <Link
              href="/teacher"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 ${
                isActive("/teacher")
                  ? "bg-[#10151D] text-[#F5BD45] border border-[#F5BD45]/50 shadow-[0_0_14px_rgba(245,189,69,0.2)]"
                  : "text-[#F5BD45] hover:bg-[#10151D]"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F5BD45]" />
              Teacher Dashboard
            </Link>
          )}

          {user && user.role === "coordinator" && (
            <Link
              href="/coordinator"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 ${
                isActive("/coordinator")
                  ? "bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/50 shadow-[0_0_14px_rgba(22,139,255,0.25)]"
                  : "text-[#36C5FF] hover:bg-[#10151D]"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#168BFF]" />
              Coordinator Workspace
            </Link>
          )}
        </nav>

        {/* Right Action Profile / Auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] hover:border-[#168BFF]/40 transition-colors text-xs text-[#F5F7FA]"
              >
                <div className="w-6 h-6 rounded-full bg-[#10151D] border border-[#222B3B] flex items-center justify-center text-[10px] font-bold text-[#F5BD45]">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="font-semibold">{user.username}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#10151D] text-[#9AA6B5] border border-[#1C2330]">
                  {user.role}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#10151D] border border-[#1C2330] shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#1C2330]">
                    <p className="text-xs font-bold text-[#F5F7FA] truncate">{user.full_name}</p>
                    <p className="text-[10px] text-[#9AA6B5] truncate">{user.email}</p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#161D28]"
                  >
                    <User className="w-3.5 h-3.5 text-[#168BFF]" /> Profile & Progress
                  </Link>

                  {user.role === "teacher" && (
                    <Link
                      href="/teacher/coordinators"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-[#F5BD45] hover:bg-[#161D28]"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Coordinator Governance
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#10151D] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 rounded-lg text-xs font-bold cyber-btn-gold"
              >
                Student Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-[#10151D] border border-[#1C2330] text-[#9AA6B5]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#F5F7FA]" /> : <Menu className="w-5 h-5 text-[#F5F7FA]" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#1C2330] bg-[#050608] px-4 pt-2 pb-4 space-y-2">
          <Link
            href="/problems"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-medium text-[#9AA6B5] hover:bg-[#10151D]"
          >
            Problems
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-medium text-[#9AA6B5] hover:bg-[#10151D]"
          >
            About Us
          </Link>
          {user && (
            <>
              {user.role === "student" && (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs font-medium text-[#9AA6B5] hover:bg-[#10151D]"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/tests"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs font-medium text-[#9AA6B5] hover:bg-[#10151D]"
                  >
                    Online Tests
                  </Link>
                </>
              )}
              {user.role === "teacher" && (
                <Link
                  href="/teacher"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-xs font-bold text-[#F5BD45] hover:bg-[#10151D]"
                >
                  Teacher Dashboard
                </Link>
              )}
              {user.role === "coordinator" && (
                <Link
                  href="/coordinator"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-xs font-bold text-[#36C5FF] hover:bg-[#10151D]"
                >
                  Coordinator Workspace
                </Link>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10"
              >
                Sign Out
              </button>
            </>
          )}
          {!user && (
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2 rounded-lg bg-[#10151D] border border-[#1C2330] text-xs font-semibold text-[#F5F7FA]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2 rounded-lg cyber-btn-gold text-xs font-bold"
              >
                Student Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
