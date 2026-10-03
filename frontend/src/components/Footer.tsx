import React from "react";
import Link from "next/link";
import { ByteVipersLogo } from "./ByteVipersLogo";
import { Terminal, Shield, Code2, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-[#1C2330] bg-[#050608] text-[#9AA6B5] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <ByteVipersLogo size={42} />
            <p className="text-xs text-[#9AA6B5] leading-relaxed">
              Think. Code. Conquer. The premier Python-only coding practice and assessment platform for students and instructors.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#10151D] border border-[#168BFF]/30 text-[11px] text-[#36C5FF]">
              <Terminal className="w-3.5 h-3.5 text-[#168BFF]" />
              <span>Python 3.x Dedicated Arena</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-bold text-[#F5F7FA] tracking-wider uppercase mb-4 font-mono">Platform</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/about" className="hover:text-[#F5BD45] text-[#FFD978] transition-colors font-medium">About ByteVipers</Link>
              </li>
              <li>
                <Link href="/problems" className="hover:text-[#36C5FF] transition-colors">Problem Library</Link>
              </li>
              <li>
                <Link href="/verify-student" className="hover:text-[#36C5FF] transition-colors">Student Verification</Link>
              </li>
              <li>
                <Link href="/tests" className="hover:text-[#36C5FF] transition-colors">Online Tests</Link>
              </li>
              <li>
                <Link href="/assignments" className="hover:text-[#36C5FF] transition-colors">Class Assignments</Link>
              </li>
              <li>
                <Link href="/teacher" className="hover:text-[#F5BD45] transition-colors font-medium">Teacher Portal</Link>
              </li>
            </ul>
          </div>

          {/* Verification Governance */}
          <div>
            <h4 className="text-xs font-bold text-[#F5F7FA] tracking-wider uppercase mb-4 font-mono">Governance</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/coordinator" className="hover:text-[#36C5FF] transition-colors">Coordinator Portal</Link>
              </li>
              <li>
                <span className="text-[#5F6B7C]">Gender-Isolated Queues</span>
              </li>
              <li>
                <span className="text-[#5F6B7C]">Append-Only Audit Trail</span>
              </li>
              <li>
                <span className="text-[#5F6B7C]">Manual Evaluation Standard</span>
              </li>
            </ul>
          </div>

          {/* System & Identity */}
          <div>
            <h4 className="text-xs font-bold text-[#F5F7FA] tracking-wider uppercase mb-4 font-mono">Arena Status</h4>
            <div className="p-3.5 rounded-xl bg-[#10151D] border border-[#1C2330] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#9AA6B5]">Platform Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Operational
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#9AA6B5]">Core Engine</span>
                <span className="text-[#F5BD45] font-mono font-bold">Python 3.14</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#9AA6B5]">Evaluation Mode</span>
                <span className="text-[#36C5FF] font-semibold">Teacher Manual Judge</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-[#1C2330] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5F6B7C]">
          <p>© {new Date().getFullYear()} ByteVipers Coding Arena. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-[#F5BD45] transition-colors">About Us</Link>
            <Link href="/terms" className="hover:text-[#9AA6B5] transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-[#9AA6B5] transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
