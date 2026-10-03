import React from "react";
import Link from "next/link";
import { ByteVipersLogo } from "@/components/ByteVipersLogo";
import {
  Sparkles,
  Heart,
  ShieldCheck,
  Users,
  Compass,
  Award,
  BookOpen,
  ArrowRight,
  Flame,
  Code2,
  Terminal,
  Clock,
  CheckCircle2,
  Share2,
  GraduationCap
} from "lucide-react";

export const metadata = {
  title: "About ByteVipers — A Legacy of Learning",
  description: "Learn about ByteVipers: a student-driven Python coding arena and learning platform created with love for juniors.",
};

export default function AboutPage() {
  return (
    <div className="flex-1 bg-[#050608] text-[#F5F7FA]">
      {/* 1. HERO SECTION — More Than a Portal */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 border-b border-[#1C2330]">
        {/* Ambient cyber glow highlights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#F5BD45]/10 via-[#168BFF]/5 to-transparent blur-3xl pointer-events-none -z-10" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Logo with circular glow */}
          <div className="inline-flex flex-col items-center justify-center">
            <div className="relative p-3 rounded-full bg-[#10151D] border border-[#F5BD45]/30 shadow-[0_0_35px_rgba(245,189,69,0.2)] hover:shadow-[0_0_45px_rgba(245,189,69,0.35)] transition-all duration-300">
              <ByteVipersLogo size={72} showText={false} priority />
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#10151D] border border-[#168BFF]/30 text-xs font-mono text-[#36C5FF]">
              <Sparkles className="w-3.5 h-3.5 text-[#F5BD45]" />
              <span>A Student-Driven Initiative</span>
            </div>
          </div>

          {/* Strong Headline */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              ByteVipers — More Than a Portal, <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#F5BD45] via-[#FFD978] to-[#F5BD45] bg-clip-text text-transparent">
                A Legacy of Learning.
              </span>
            </h1>
            
            {/* Primary Tagline */}
            <div className="pt-2">
              <p className="text-sm sm:text-base font-mono font-bold tracking-widest uppercase text-[#36C5FF] flex items-center justify-center gap-2">
                <span>Learn Together</span>
                <span className="text-[#F5BD45]">•</span>
                <span>Grow Together</span>
                <span className="text-[#F5BD45]">•</span>
                <span>Pass It Forward</span>
              </p>
            </div>
          </div>

          {/* Supporting Text */}
          <div className="max-w-3xl mx-auto space-y-4 text-sm sm:text-base text-[#9AA6B5] leading-relaxed">
            <p>
              Built with love for our juniors, <strong className="text-[#F5F7FA]">ByteVipers</strong> is a student-driven learning platform created to bring learning resources, assignments, interview preparation, online tests, and opportunities for growth together in one place.
            </p>
            <p className="text-[#9AA6B5]/90">
              But the vision goes beyond a website. It is about building a community where students help one another learn, grow, and achieve more—and where every generation passes that opportunity forward.
            </p>
          </div>

          {/* Quick CTA links */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/problems"
              className="cyber-btn-gold px-6 py-3 rounded-xl text-xs font-bold glow-gold inline-flex items-center gap-2"
            >
              Enter Practice Arena <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#our-story"
              className="px-6 py-3 rounded-xl cyber-card border border-[#1C2330] hover:border-[#168BFF]/40 text-xs font-semibold text-[#9AA6B5] hover:text-[#F5F7FA] transition-all"
            >
              Read Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* 2. THE STORY BEHIND BYTEVIPERS */}
      <section id="our-story" className="py-20 md:py-28 border-b border-[#1C2330] relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10151D] border border-[#F5BD45]/30 text-xs font-semibold text-[#F5BD45]">
              <Heart className="w-3.5 h-3.5 text-[#F5BD45]" />
              <span>THE ORIGIN STORY</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F5F7FA]">
              A Small Gift. A Bigger Dream.
            </h2>
          </div>

          {/* Story Narrative Box */}
          <div className="cyber-card p-8 sm:p-12 rounded-3xl border border-[#1C2330] relative space-y-6 text-[#9AA6B5] text-sm sm:text-base leading-relaxed">
            {/* Top gold accent bar */}
            <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-[#F5BD45] to-transparent" />

            <p>
              ByteVipers began with a simple thought: what if students had one place where they could find useful learning resources, prepare for interviews, practise through online tests, work on assignments, and support one another throughout their academic journey?
            </p>

            <p>
              I wanted to build something meaningful for my juniors—a platform that could help them explore new concepts, develop their skills, become more confident, and prepare for the opportunities ahead.
            </p>

            <p>
              The idea was never just to create another online portal. It was to create something that students could use, improve, and carry forward together.
            </p>

            <p>
              Every feature, every contribution, and every new idea can become part of a larger journey: a journey in which learning is shared, opportunities are passed on, and one generation helps the next move forward.
            </p>

            <p>
              That is the spirit behind ByteVipers. A small gift for today&apos;s students, with the hope of becoming a lasting source of learning for tomorrow&apos;s.
            </p>

            {/* Highlighted Quote Banner */}
            <div className="pt-6">
              <div className="p-6 sm:p-8 rounded-2xl bg-[#0B0E14] border border-[#F5BD45]/40 shadow-[0_0_20px_rgba(245,189,69,0.15)] text-center relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-7xl font-serif text-[#F5BD45]/5 select-none pointer-events-none">
                  ”
                </div>
                <p className="text-base sm:text-xl font-bold text-[#FFD978] tracking-tight">
                  “A small gift for my juniors. A lasting opportunity for generations.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. OUR VISION — A Learning Legacy */}
      <section className="py-20 md:py-28 border-b border-[#1C2330] bg-[#080B10]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10151D] border border-[#168BFF]/30 text-xs font-semibold text-[#36C5FF]">
              <Compass className="w-3.5 h-3.5" />
              <span>THE CORE FOUNDATION</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F5F7FA]">
              Built Today. Carried Forward Tomorrow.
            </h2>
            <p className="text-xs sm:text-sm text-[#9AA6B5] leading-relaxed">
              ByteVipers is intentionally designed to continue thriving far beyond its original creator and current student batch through community governance and purposeful continuity.
            </p>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1 */}
            <div className="cyber-card p-6 sm:p-8 rounded-2xl border border-[#1C2330] hover:border-[#168BFF]/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F7FA]">A Verified Learning Community</h3>
              <p className="text-xs sm:text-sm text-[#9AA6B5] leading-relaxed">
                Students register on the platform and go through the student verification process before gaining access to protected learning resources, ensuring a trusted academic environment dedicated solely to growth.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="cyber-card p-6 sm:p-8 rounded-2xl border border-[#1C2330] hover:border-[#F5BD45]/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F7FA]">Four Student Coordinators</h3>
              <p className="text-xs sm:text-sm text-[#9AA6B5] leading-relaxed">
                The platform begins with four designated Student Coordinator positions: two male and two female. Coordinators help manage student verification through their respective dashboards, following the platform&apos;s gender-based access rules.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="cyber-card p-6 sm:p-8 rounded-2xl border border-[#1C2330] hover:border-[#168BFF]/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F7FA]">Transparency and Accountability</h3>
              <p className="text-xs sm:text-sm text-[#9AA6B5] leading-relaxed">
                Verification decisions and relevant actions are recorded so the platform maintains an immutable history of who handled each verification and when, preventing unauthorized actions and upholding academic integrity.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="cyber-card p-6 sm:p-8 rounded-2xl border border-[#1C2330] hover:border-[#F5BD45]/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 flex items-center justify-center">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F7FA]">Passing the Torch</h3>
              <p className="text-xs sm:text-sm text-[#9AA6B5] leading-relaxed">
                As students become seniors and eventually graduate, coordinator responsibilities can be handed over to the next selected group. Each new generation can contribute ideas, improve the platform, and help make it more useful for those who follow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW THE LEGACY GROWS (Four-stage circuit timeline) */}
      <section className="py-20 md:py-28 border-b border-[#1C2330] relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10151D] border border-[#F5BD45]/30 text-xs font-semibold text-[#F5BD45]">
              <Share2 className="w-3.5 h-3.5" />
              <span>THE CYCLE OF SUCCESSION</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F5F7FA]">
              How the Legacy Grows
            </h2>
            <p className="text-xs sm:text-sm text-[#9AA6B5]">
              From first-year learners to community leaders, every stage fosters collective progress.
            </p>
          </div>

          {/* Timeline Stages */}
          <div className="relative">
            {/* Subtle gold circuit line across desktop */}
            <div className="hidden lg:block absolute top-1/2 left-8 right-8 -translate-y-1/2 h-[2px] bg-gradient-to-r from-[#F5BD45]/20 via-[#F5BD45] to-[#168BFF]/40 -z-0" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              {/* Stage 1 */}
              <div className="cyber-card p-6 rounded-2xl border border-[#1C2330] bg-[#10151D] flex flex-col justify-between hover:border-[#F5BD45]/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-[#F5BD45]">01</span>
                    <span className="w-3 h-3 rounded-full bg-[#F5BD45] shadow-[0_0_8px_#F5BD45]" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-[#F5F7FA]">Learn</h4>
                    <p className="mt-2 text-xs text-[#9AA6B5] leading-relaxed">
                      Students explore learning resources, assignments, interview questions, coding practice, and online tests.
                    </p>
                  </div>
                </div>
                <div className="pt-4 text-[10px] font-mono text-[#5F6B7C] uppercase tracking-wider">Foundation Stage</div>
              </div>

              {/* Stage 2 */}
              <div className="cyber-card p-6 rounded-2xl border border-[#1C2330] bg-[#10151D] flex flex-col justify-between hover:border-[#36C5FF]/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-[#36C5FF]">02</span>
                    <span className="w-3 h-3 rounded-full bg-[#36C5FF] shadow-[0_0_8px_#36C5FF]" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-[#F5F7FA]">Contribute</h4>
                    <p className="mt-2 text-xs text-[#9AA6B5] leading-relaxed">
                      Students share knowledge, offer ideas, help their peers, and contribute to the learning community.
                    </p>
                  </div>
                </div>
                <div className="pt-4 text-[10px] font-mono text-[#5F6B7C] uppercase tracking-wider">Collaboration Stage</div>
              </div>

              {/* Stage 3 */}
              <div className="cyber-card p-6 rounded-2xl border border-[#1C2330] bg-[#10151D] flex flex-col justify-between hover:border-[#F5BD45]/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-[#F5BD45]">03</span>
                    <span className="w-3 h-3 rounded-full bg-[#F5BD45] shadow-[0_0_8px_#F5BD45]" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-[#F5F7FA]">Lead</h4>
                    <p className="mt-2 text-xs text-[#9AA6B5] leading-relaxed">
                      Selected Student Coordinators help manage verification and take responsibility for supporting the community.
                    </p>
                  </div>
                </div>
                <div className="pt-4 text-[10px] font-mono text-[#5F6B7C] uppercase tracking-wider">Leadership Stage</div>
              </div>

              {/* Stage 4 */}
              <div className="cyber-card p-6 rounded-2xl border border-[#1C2330] bg-[#10151D] flex flex-col justify-between hover:border-[#36C5FF]/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-[#36C5FF]">04</span>
                    <span className="w-3 h-3 rounded-full bg-[#36C5FF] shadow-[0_0_8px_#36C5FF]" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-[#F5F7FA]">Pass It Forward</h4>
                    <p className="mt-2 text-xs text-[#9AA6B5] leading-relaxed">
                      As one batch moves ahead, the next generation continues the work, preserving what is valuable and introducing new improvements.
                    </p>
                  </div>
                </div>
                <div className="pt-4 text-[10px] font-mono text-[#5F6B7C] uppercase tracking-wider">Continuity Stage</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHAT BYTEVIPERS STANDS FOR */}
      <section className="py-20 md:py-28 border-b border-[#1C2330] bg-[#080B10]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F5F7FA]">
              What ByteVipers Stands For
            </h2>
            <p className="text-xs sm:text-sm text-[#9AA6B5]">
              Guiding principles that define our culture, platform design, and mission.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Learning */}
            <div className="cyber-card p-6 rounded-2xl border border-[#1C2330] hover:border-[#168BFF]/40 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F5F7FA]">Learning</h3>
              <p className="text-xs text-[#9AA6B5] leading-relaxed">
                Making useful educational resources easier to access.
              </p>
            </div>

            {/* Community */}
            <div className="cyber-card p-6 rounded-2xl border border-[#1C2330] hover:border-[#F5BD45]/40 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F5F7FA]">Community</h3>
              <p className="text-xs text-[#9AA6B5] leading-relaxed">
                Encouraging students to help one another grow.
              </p>
            </div>

            {/* Responsibility */}
            <div className="cyber-card p-6 rounded-2xl border border-[#1C2330] hover:border-[#168BFF]/40 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F5F7FA]">Responsibility</h3>
              <p className="text-xs text-[#9AA6B5] leading-relaxed">
                Building trust through verification and accountability.
              </p>
            </div>

            {/* Legacy */}
            <div className="cyber-card p-6 rounded-2xl border border-[#1C2330] hover:border-[#F5BD45]/40 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F5F7FA]">Legacy</h3>
              <p className="text-xs text-[#9AA6B5] leading-relaxed">
                Creating something future student generations can continue to improve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOUNDER / CREATOR CREDIT */}
      <section className="py-20 md:py-28 border-b border-[#1C2330] relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#F5BD45]/5 blur-3xl pointer-events-none -z-10" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10151D] border border-[#F5BD45]/30 text-xs font-semibold text-[#F5BD45]">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>CREATOR & ARCHITECT</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F5F7FA]">
              The Person Behind the Vision
            </h2>
          </div>

          <div className="cyber-card p-8 sm:p-12 rounded-3xl border border-[#F5BD45]/30 shadow-[0_0_30px_rgba(245,189,69,0.1)] relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {/* Official ByteVipers Emblem */}
              <div className="p-3 rounded-2xl bg-[#0B0E14] border border-[#F5BD45]/40 shrink-0 shadow-[0_0_20px_rgba(245,189,69,0.25)]">
                <ByteVipersLogo size={60} showText={false} priority />
              </div>

              {/* Founder Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#F5F7FA] tracking-tight">
                    Harshit Gupta
                  </h3>
                  <div className="mt-1 inline-block px-2.5 py-0.5 rounded-md bg-[#10151D] border border-[#168BFF]/30 font-mono text-xs font-semibold text-[#36C5FF]">
                    M.Sc. Mathematics with AI and DS | 2025–27
                  </div>
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-[#9AA6B5] leading-relaxed">
                  <p>
                    ByteVipers is an initiative envisioned and built by Harshit Gupta as a small gift for his juniors—a platform created to encourage learning, sharing, and collective growth.
                  </p>
                  <p>
                    His vision is to help turn a student-built project into a continuing learning legacy, where every generation benefits from the work of those who came before and contributes something valuable for those who follow.
                  </p>
                </div>

                {/* Signature-style closing line */}
                <div className="pt-4 border-t border-[#1C2330]">
                  <p className="font-serif italic text-sm sm:text-base text-[#FFD978]">
                    “Built with purpose. Shared with love. Carried forward together.”
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CLOSING MESSAGE */}
      <section className="py-20 md:py-28 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="p-8 sm:p-14 rounded-3xl cyber-card border border-[#1C2330] bg-gradient-to-b from-[#10151D] to-[#0B0E14] shadow-2xl space-y-6">
            <div className="inline-flex justify-center">
              <span className="text-3xl">🐍</span>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-[#9AA6B5] leading-relaxed max-w-2xl mx-auto">
              <p>
                Years from now, the true value of ByteVipers will not be measured only by how many students used it, but by how many students it helped—and by whether that spirit of learning and sharing continued after one batch moved on.
              </p>
              <p className="font-semibold text-[#F5F7FA]">
                Let us make this more than a project. Let us make it a tradition.
              </p>
              <p className="text-[#9AA6B5]/90">
                A place where seniors guide, juniors grow, and every generation gives something back.
              </p>
            </div>

            <div className="pt-6 border-t border-[#1C2330] space-y-2">
              <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#F5F7FA]">
                ByteVipers 🐍
              </div>
              <p className="text-xs sm:text-sm font-mono font-bold tracking-wider uppercase text-[#F5BD45]">
                Learn Together. Grow Together. Pass It Forward.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/problems"
              className="cyber-btn-blue inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-xs font-bold glow-blue tracking-wider"
            >
              Start Coding in the Arena <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
