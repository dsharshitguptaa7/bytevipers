import React from "react";

export default function TermsPage() {
  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 py-16 w-full space-y-6 text-sm text-[#9AA6B5] leading-relaxed">
      <div className="cyber-card p-8 rounded-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#F5F7FA]">Terms of Service</h1>
          <p className="text-xs text-[#5F6B7C] mt-1 font-mono">Last updated: October 2026</p>
        </div>

        <section className="space-y-2 pt-2 border-t border-[#1C2330]">
          <h2 className="text-base font-bold text-[#F5F7FA]">1. Academic Integrity & Honest Submissions</h2>
          <p>
            Students agree to author original Python solutions for all course assignments. Automated plagiarism scanning, attempt tracking, and deadline enforcement are applied across all evaluations.
          </p>
        </section>

        <section className="space-y-2 pt-2 border-t border-[#1C2330]">
          <h2 className="text-base font-bold text-[#F5F7FA]">2. Code Execution Safeguards</h2>
          <p>
            Submitting malicious Python scripts, denial-of-service attempts, subprocess fork-bombs, or unauthorized system introspection will trigger automated account suspension and administrative audit logging.
          </p>
        </section>

        <section className="space-y-2 pt-2 border-t border-[#1C2330]">
          <h2 className="text-base font-bold text-[#F5F7FA]">3. Role Governance & Permissions</h2>
          <p>
            Instructor accounts must adhere to assigned institutional scopes. Attempting to bypass role-based access control or forge verification decisions constitutes grounds for permanent platform expulsion.
          </p>
        </section>
      </div>
    </div>
  );
}
