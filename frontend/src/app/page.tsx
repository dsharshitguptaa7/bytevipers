"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ByteVipersLogo } from "@/components/ByteVipersLogo";
import {
  Terminal, ShieldCheck, Cpu, Trophy, ArrowRight, Code2,
  CheckCircle2, Flame, Sparkles, BookOpen, Layers, Zap, Users
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();
  const [featuredProblems, setFeaturedProblems] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [probs, allTags] = await Promise.all([
          api.listProblems(),
          api.listTags(),
        ]);
        setFeaturedProblems(probs.slice(0, 4));
        setTags(allTags);
      } catch (err) {
        console.error("Failed to load platform data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#050608]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 border-b border-[#1C2330] cyber-grid">
        {/* Glow backdrop with brand colors */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-[#168BFF]/12 via-[#F5BD45]/10 to-transparent blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Prominent Official Logo Emblem */}
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-2xl bg-[#10151D]/90 border border-[#222B3B] shadow-[0_0_30px_rgba(245,189,69,0.12)]">
              <ByteVipersLogo size={68} showText={false} />
            </div>
          </div>

          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#10151D] border border-[#F5BD45]/40 shadow-[0_0_15px_rgba(245,189,69,0.15)] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#F5BD45] animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-widest text-[#FFD978] uppercase">
              Think. Code. Conquer.
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#F5F7FA] max-w-4xl mx-auto leading-tight">
            Master Algorithmic <br />
            <span className="bg-gradient-to-r from-[#168BFF] via-[#36C5FF] to-[#FFD978] bg-clip-text text-transparent font-mono">
              Python Programming
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[#94A6B5] max-w-2xl mx-auto leading-relaxed">
            The dedicated Python-only coding arena &amp; automated assessment platform.
            Powered by coordinator-verified enrollment, high-speed testing, and unified instructor tooling.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              user.role === "student" && (user.verification_status || "").toLowerCase() === "approved" ? (
                <Link
                  href="/dashboard"
                  className="px-6 py-3.5 rounded-xl cyber-btn-blue text-sm flex items-center gap-2"
                >
                  Enter Arena Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : user.role === "teacher" ? (
                <Link
                  href="/teacher"
                  className="px-6 py-3.5 rounded-xl cyber-btn-gold text-sm flex items-center gap-2"
                >
                  Instructor Super Admin <ArrowRight className="w-4 h-4" />
                </Link>
              ) : user.role === "coordinator" ? (
                <Link
                  href="/coordinator"
                  className="px-6 py-3.5 rounded-xl cyber-btn-blue text-sm flex items-center gap-2"
                >
                  Coordinator Workspace <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/verify-student"
                  className="px-6 py-3.5 rounded-xl bg-[#10151D] border border-[#F5BD45]/60 text-[#FFD978] font-bold text-sm hover:bg-[#F5BD45]/10 transition-all flex items-center gap-2"
                >
                  {(user.verification_status || "").toLowerCase() === "pending"
                    ? "View Verification Status"
                    : "Complete Verification"}{" "}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )
            ) : (
              <>
                <Link
                  href="/register"
                  className="px-6 py-3.5 rounded-xl cyber-btn-blue text-sm flex items-center gap-2"
                >
                  Start Coding <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3.5 rounded-xl bg-[#10151D] border border-[#F5BD45]/40 text-[#FFD978] font-bold text-sm hover:border-[#F5BD45] hover:bg-[#F5BD45]/10 transition-all flex items-center gap-2"
                >
                  Coordinator &amp; Faculty Portal <ShieldCheck className="w-4 h-4 text-[#F5BD45]" />
                </Link>
                <Link
                  href="/problems"
                  className="px-6 py-3.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-[#F5F7FA] font-semibold text-sm hover:border-[#168BFF]/50 hover:bg-[#10151D] transition-all flex items-center gap-2"
                >
                  Explore Problems <Code2 className="w-4 h-4 text-[#36C5FF]" />
                </Link>
              </>
            )}
          </div>

          {/* Code Highlight Box */}
          <div className="mt-14 max-w-3xl mx-auto text-left rounded-xl bg-[#10151D] border border-[#1C2330] shadow-2xl overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#0B0E14] border-b border-[#1C2330]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-[#F5BD45]/80" />
                <span className="w-3 h-3 rounded-full bg-[#22C55E]/80" />
                <span className="ml-2 text-[#9AA6B5] text-[11px]">bytevipers_arena.py</span>
              </div>
              <span className="text-[#36C5FF] text-[10px] tracking-wider uppercase font-semibold">Python 3.12+ Cyber Arena</span>
            </div>
            <div className="p-5 text-[#F5F7FA] space-y-1.5 overflow-x-auto">
              <p className="text-[#5F6B7C]"># ByteVipers: Think. Code. Conquer.</p>
              <p><span className="text-[#F5BD45]">def</span> <span className="text-[#36C5FF]">conquer_challenge</span>(student_solution):</p>
              <p className="pl-4">arena = ByteVipersJudge(language=<span className="text-[#22C55E]">&apos;python&apos;</span>, mode=<span className="text-[#FFD978]">&apos;verified&apos;</span>)</p>
              <p className="pl-4">verdict = arena.evaluate(student_solution)</p>
              <p className="pl-4 text-[#22C55E]">assert verdict == &apos;Accepted&apos; <span className="text-[#5F6B7C]"># Official ByteVipers Judge</span></p>
              <p className="pl-4 text-[#36C5FF]">return &quot;Conquest Complete!&quot;</p>
            </div>
          </div>
        </div>
      </section>

      {/* Real Statistics Section */}
      <section className="py-12 border-b border-[#1C2330] bg-[#0B0E14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-xl bg-[#10151D] border border-[#1C2330]">
              <p className="text-3xl font-extrabold font-mono text-[#36C5FF]">{featuredProblems.length > 0 ? featuredProblems.length : "3"}+</p>
              <p className="mt-1 text-xs text-[#9AA6B5] uppercase tracking-wider font-semibold">Core Challenges</p>
            </div>
            <div className="p-4 rounded-xl bg-[#10151D] border border-[#1C2330]">
              <p className="text-3xl font-extrabold font-mono text-[#FFD978]">100%</p>
              <p className="mt-1 text-xs text-[#9AA6B5] uppercase tracking-wider font-semibold">Pure Python Focus</p>
            </div>
            <div className="p-4 rounded-xl bg-[#10151D] border border-[#1C2330]">
              <p className="text-3xl font-extrabold font-mono text-[#36C5FF]">4</p>
              <p className="mt-1 text-xs text-[#9AA6B5] uppercase tracking-wider font-semibold">Student Coordinators</p>
            </div>
            <div className="p-4 rounded-xl bg-[#10151D] border border-[#1C2330]">
              <p className="text-3xl font-extrabold font-mono text-[#F5BD45]">{tags.length > 0 ? tags.length : "7"}</p>
              <p className="mt-1 text-xs text-[#9AA6B5] uppercase tracking-wider font-semibold">Algorithmic Categories</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 border-b border-[#1C2330]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-[#F5F7FA]">Engineered For Serious Coders</h2>
            <p className="mt-3 text-sm text-[#9AA6B5]">
              Everything you need to practice, assess, and master algorithmic Python.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl cyber-card group">
              <div className="w-12 h-12 rounded-xl bg-[#168BFF]/10 border border-[#168BFF]/30 flex items-center justify-center text-[#36C5FF] mb-5 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F5F7FA]">Pure Python Arena</h3>
              <p className="mt-2 text-xs text-[#9AA6B5] leading-relaxed">
                Dedicated Python execution with manual evaluation, instant test run results, and comprehensive solution scoring.
              </p>
            </div>

            <div className="p-6 rounded-2xl cyber-card group">
              <div className="w-12 h-12 rounded-xl bg-[#F5BD45]/10 border border-[#F5BD45]/30 flex items-center justify-center text-[#FFD978] mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F5F7FA]">Coordinator Verification</h3>
              <p className="mt-2 text-xs text-[#94A6B5] leading-relaxed">
                4 student coordinators handle gender-routed verification queues with strict audit history to protect academic integrity.
              </p>
            </div>

            <div className="p-6 rounded-2xl cyber-card group">
              <div className="w-12 h-12 rounded-xl bg-[#168BFF]/10 border border-[#168BFF]/30 flex items-center justify-center text-[#36C5FF] mb-5 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F5F7FA]">Tests &amp; Assessments</h3>
              <p className="mt-2 text-xs text-[#9AA6B5] leading-relaxed">
                Timed online coding and theory tests with question navigators, auto-save drafts, and manual instructor grading.
              </p>
            </div>

            <div className="p-6 rounded-2xl cyber-card group">
              <div className="w-12 h-12 rounded-xl bg-[#F5BD45]/10 border border-[#F5BD45]/30 flex items-center justify-center text-[#FFD978] mb-5 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F5F7FA]">Super Admin Control</h3>
              <p className="mt-2 text-xs text-[#9AA6B5] leading-relaxed">
                One unified Instructor dashboard with complete coordinator provisioning, problem curation, and score evaluation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Problems Section */}
      <section className="py-20 border-b border-[#1C2330] bg-[#0B0E14]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-[#F5F7FA]">Featured Challenges</h2>
              <p className="mt-2 text-sm text-[#9AA6B5]">Solve Python problems and conquer algorithmic tests.</p>
            </div>
            <Link
              href="/problems"
              className="text-xs font-semibold text-[#36C5FF] hover:underline flex items-center gap-1.5"
            >
              View all problems <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredProblems.map((prob) => (
              <Link
                key={prob.id}
                href={`/problems/${prob.slug}`}
                className="p-5 rounded-xl cyber-card hover:border-[#168BFF]/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#F5F7FA]">{prob.title}</h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        prob.difficulty === "Easy"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : prob.difficulty === "Medium"
                          ? "bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30"
                          : "bg-red-500/10 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {prob.difficulty}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {prob.tags?.map((t: any) => (
                      <span key={t.id} className="text-[11px] px-2 py-0.5 rounded bg-[#0B0E14] border border-[#1C2330] text-[#9AA6B5]">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#1C2330] flex items-center justify-between text-xs text-[#5F6B7C]">
                  <span>Execution limit: {prob.time_limit_ms}ms</span>
                  <span className="text-[#36C5FF] font-medium flex items-center gap-1">Solve <ArrowRight className="w-3 h-3" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / Workflow */}
      <section id="how-it-works" className="py-20 bg-[#050608]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-[#F5F7FA]">How ByteVipers Works</h2>
          <p className="mt-2 text-sm text-[#9AA6B5] max-w-xl mx-auto">
            A frictionless path from student registration to algorithmic conquest.
          </p>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            <div className="p-6 rounded-2xl cyber-card relative">
              <span className="text-3xl font-extrabold font-mono text-[#168BFF]/30">01</span>
              <h4 className="mt-3 text-base font-bold text-[#F5F7FA]">Register &amp; Apply</h4>
              <p className="mt-2 text-xs text-[#9AA6B5] leading-relaxed">
                Create your student account with gender selection and submit institutional verification details.
              </p>
            </div>

            <div className="p-6 rounded-2xl cyber-card relative">
              <span className="text-3xl font-extrabold font-mono text-[#F5BD45]/30">02</span>
              <h4 className="mt-3 text-base font-bold text-[#F5F7FA]">Coordinator Review</h4>
              <p className="mt-2 text-xs text-[#9AA6B5] leading-relaxed">
                Designated male/female coordinators verify student credentials with full audit log trails.
              </p>
            </div>

            <div className="p-6 rounded-2xl cyber-card relative">
              <span className="text-3xl font-extrabold font-mono text-[#168BFF]/30">03</span>
              <h4 className="mt-3 text-base font-bold text-[#F5F7FA]">Code in Python</h4>
              <p className="mt-2 text-xs text-[#9AA6B5] leading-relaxed">
                Develop Python algorithms in the dark Monaco editor with draft autosaving and sample test runs.
              </p>
            </div>

            <div className="p-6 rounded-2xl cyber-card relative">
              <span className="text-3xl font-extrabold font-mono text-[#F5BD45]/30">04</span>
              <h4 className="mt-3 text-base font-bold text-[#F5F7FA]">Manual &amp; Arena Grading</h4>
              <p className="mt-2 text-xs text-[#9AA6B5] leading-relaxed">
                Instructors evaluate submissions and online tests with granular scores and personalized feedback.
              </p>
            </div>
          </div>

          <div className="mt-16">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl cyber-btn-blue text-sm shadow-[0_0_25px_rgba(22,139,255,0.4)]"
            >
              Join the Arena Today <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
