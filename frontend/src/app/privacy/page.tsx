import React from "react";

export default function PrivacyPage() {
  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 py-16 w-full space-y-6 text-sm text-[#9AA6B5] leading-relaxed">
      <div className="cyber-card p-8 rounded-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#F5F7FA]">Privacy Policy</h1>
          <p className="text-xs text-[#5F6B7C] mt-1 font-mono">Last updated: October 2026</p>
        </div>

        <section className="space-y-2 pt-2 border-t border-[#1C2330]">
          <h2 className="text-base font-bold text-[#F5F7FA]">1. Student Verification Credentials</h2>
          <p>
            ByteVipers collects academic verification information (such as full name, institutional email, department, and student roll number) solely for confirming student enrollment and protecting course assessment integrity. Supporting records are private, access-controlled, and accessible only to authorized institutional reviewers.
          </p>
        </section>

        <section className="space-y-2 pt-2 border-t border-[#1C2330]">
          <h2 className="text-base font-bold text-[#F5F7FA]">2. Code Submissions & Judging Telemetry</h2>
          <p>
            Python source code submitted to the ByteVipers judging pipeline is evaluated in an isolated sandbox environment. We store execution runtimes, memory metrics, and test case pass/fail verdicts to populate personal progress analytics and instructor evaluation reports.
          </p>
        </section>

        <section className="space-y-2 pt-2 border-t border-[#1C2330]">
          <h2 className="text-base font-bold text-[#F5F7FA]">3. Data Security & Storage</h2>
          <p>
            Passwords are cryptographically hashed using salted bcrypt hashes. Sensitive platform operations and verification reviews are recorded in immutable audit logs. We do not sell or monetize personal academic records.
          </p>
        </section>
      </div>
    </div>
  );
}
