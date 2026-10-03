"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Clock, Code2, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

export default function SubmissionsHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
        return;
      }
      async function loadHistory() {
        try {
          const data = await api.getMySubmissionHistory();
          setSubmissions(data);
        } catch (err) {
          console.error("Failed to load submissions:", err);
        } finally {
          setLoading(false);
        }
      }
      loadHistory();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#9AA6B5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#168BFF] mb-2" />
        <span className="ml-3 text-sm">Loading Submission Records...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="pb-8 border-b border-[#1C2330]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30 uppercase tracking-wider">
            Evaluation Ledger
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#F5F7FA]">Submission History</h1>
        <p className="text-sm text-[#9AA6B5] mt-1">
          Complete log of all your Python evaluations across practice challenges and course assignments.
        </p>
      </div>

      <div className="mt-8 cyber-card rounded-2xl shadow-xl overflow-hidden">
        {submissions.length === 0 ? (
          <div className="p-16 text-center text-[#9AA6B5]">
            <Code2 className="w-10 h-10 mx-auto text-[#5F6B7C] mb-3" />
            <h3 className="text-base font-bold text-[#F5F7FA]">No Submissions Yet</h3>
            <p className="text-xs mt-1 text-[#5F6B7C]">Solve a problem in the arena to generate evaluation records.</p>
            <Link href="/problems" className="mt-4 inline-block px-4 py-2 rounded-xl cyber-btn-blue font-bold text-xs glow-blue">
              Go to Problems
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0B0E14] text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                <tr>
                  <th className="py-3.5 px-6">Problem</th>
                  <th className="py-3.5 px-6">Verdict</th>
                  <th className="py-3.5 px-6">Tests Passed</th>
                  <th className="py-3.5 px-6">Runtime</th>
                  <th className="py-3.5 px-6">Memory</th>
                  <th className="py-3.5 px-6 text-right">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2330]">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#161D28]/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-[#F5F7FA]">
                      {sub.problem_title || `Problem #${sub.problem_id}`}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                          sub.verdict === "Accepted"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }`}
                      >
                        {sub.verdict || sub.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-[#9AA6B5]">
                      {sub.passed_tests} / {sub.total_tests}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-[#5F6B7C]">
                      {sub.execution_time_ms ? `${sub.execution_time_ms} ms` : "—"}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-[#5F6B7C]">
                      {sub.memory_used_kb ? `${sub.memory_used_kb} KB` : "—"}
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-[#5F6B7C]">
                      {new Date(sub.created_at).toLocaleString()}
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
