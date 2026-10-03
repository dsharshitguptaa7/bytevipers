"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Award, CheckCircle2, Clock, FileQuestion, ArrowLeft,
  AlertCircle, MessageSquare, Loader2, BookOpen
} from "lucide-react";
import ByteVipersLogo from "@/components/ByteVipersLogo";

export default function StudentTestResultPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const testId = Number(resolvedParams.id);

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadResult() {
      try {
        const data = await api.getMyTestResult(testId);
        setResult(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load test results.");
      } finally {
        setLoading(false);
      }
    }
    loadResult();
  }, [testId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-16 flex flex-col items-center justify-center text-[#9AA6B5]">
        <ByteVipersLogo size={48} priority className="mb-4 animate-pulse glow-blue" />
        <div className="flex items-center gap-2 text-sm text-[#168BFF]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Retrieving assessment evaluation records...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !result) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center rounded-2xl cyber-card border border-[#1C2330]">
        <AlertCircle className="w-12 h-12 mx-auto text-[#F5BD45] mb-3" />
        <h3 className="text-base font-bold text-[#F5F7FA]">Result Not Available</h3>
        <p className="text-xs text-[#9AA6B5] mt-1">{errorMsg || "Unable to find attempt records for this assessment."}</p>
        <Link href="/tests" className="mt-4 inline-block px-4 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs font-bold text-[#168BFF] hover:border-[#168BFF]">
          Back to Tests
        </Link>
      </div>
    );
  }

  const isPublished = result.status === "PUBLISHED";
  const percentage =
    result.total_score !== null && result.max_score
      ? Math.round((result.total_score / result.max_score) * 100)
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/tests" className="inline-flex items-center gap-1.5 text-xs text-[#9AA6B5] hover:text-[#F5F7FA] transition-colors">
        <ArrowLeft className="w-4 h-4 text-[#168BFF]" /> Back to Online Tests
      </Link>

      {/* Main Header / Scorecard */}
      <div className="cyber-card p-8 rounded-2xl space-y-6 glow-blue relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#168BFF] to-transparent" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isPublished
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-[#168BFF]/10 text-[#36C5FF] border-[#168BFF]/30"
                }`}
              >
                {isPublished ? "Result Published" : "Evaluation Pending"}
              </span>
              <span className="text-xs text-[#5F6B7C] font-mono">Attempt ID #{result.id}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#F5F7FA]">{result.test_title || "Online Assessment"}</h1>
            <p className="text-xs text-[#9AA6B5] mt-0.5">
              Candidate: <span className="text-[#F5F7FA] font-semibold">{result.student_name}</span> ({result.student_email})
            </p>
          </div>

          {/* Published Score Badge */}
          {isPublished && (
            <div className="p-4 rounded-2xl bg-[#0B0E14] border border-[#1C2330] text-center min-w-[160px] glow-gold">
              <div className="text-[10px] font-bold text-[#5F6B7C] uppercase tracking-wider">Final Score</div>
              <div className="text-2xl font-black text-[#FFD978] font-mono mt-0.5">
                {result.total_score} <span className="text-xs text-[#5F6B7C] font-normal">/ {result.max_score}</span>
              </div>
              {percentage !== null && (
                <div className="text-xs font-semibold text-[#36C5FF] mt-1">{percentage}% Aggregate</div>
              )}
            </div>
          )}
        </div>

        {/* Pending Notice if not published */}
        {!isPublished ? (
          <div className="p-5 rounded-2xl bg-[#0B0E14] border border-[#168BFF]/30 text-xs text-[#9AA6B5] space-y-2">
            <div className="flex items-center gap-2 text-[#36C5FF] font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-[#168BFF]" />
              <span>Assessment Completed & Submitted</span>
            </div>
            <p className="leading-relaxed">
              Your answers have been securely recorded. This assessment requires manual grading by your course instructor.
              Marks, individual question scores, and qualitative feedback will appear here as soon as the evaluation is published.
            </p>
            <div className="text-[11px] text-[#5F6B7C] pt-2">
              Submitted at: {result.submitted_at ? new Date(result.submitted_at).toLocaleString() : "Recently"}
            </div>
          </div>
        ) : result.feedback ? (
          <div className="p-5 rounded-2xl bg-[#0B0E14] border border-[#1C2330] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#F5BD45] uppercase tracking-wider">
              <MessageSquare className="w-4 h-4" />
              <span>Instructor Overall Feedback</span>
            </div>
            <p className="text-xs sm:text-sm text-[#F5F7FA] whitespace-pre-wrap leading-relaxed">
              {result.feedback}
            </p>
            {result.evaluator_name && (
              <p className="text-[11px] text-[#5F6B7C] pt-1">
                Evaluated by: {result.evaluator_name} on{" "}
                {result.published_at ? new Date(result.published_at).toLocaleDateString() : ""}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* Question Responses & Breakdown */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#F5F7FA] uppercase tracking-wider">Question Breakdown & Responses</h3>

        <div className="space-y-4">
          {result.answers?.map((ans: any, idx: number) => {
            const q = ans.question;
            return (
              <div
                key={ans.id || idx}
                className="cyber-card p-6 rounded-2xl space-y-4"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#1C2330]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-mono text-[#5F6B7C]">{q?.question_type}</span>
                  </div>

                  {isPublished && (
                    <div className="text-xs font-mono font-bold">
                      <span className="text-emerald-400">{ans.score ?? 0}</span>
                      <span className="text-[#5F6B7C]"> / {q?.marks ?? 0} pts</span>
                    </div>
                  )}
                </div>

                {/* Question Prompt */}
                <div>
                  <h4 className="text-sm font-bold text-[#F5F7FA]">{q?.title}</h4>
                  <p className="text-xs text-[#9AA6B5] mt-1 whitespace-pre-wrap leading-relaxed">{q?.description}</p>
                </div>

                {/* Candidate's Submitted Response */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold uppercase text-[#5F6B7C] tracking-wider block mb-1.5">
                    Your Response:
                  </span>

                  {q?.question_type === "MCQ" && (
                    <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs font-mono text-[#F5F7FA]">
                      Selected Option:{" "}
                      <span className="font-bold text-[#36C5FF]">
                        {ans.selected_option ? ans.selected_option.toUpperCase() : "No option selected"}
                      </span>
                    </div>
                  )}

                  {(q?.question_type === "SHORT_ANSWER" || q?.question_type === "LONG_ANSWER") && (
                    <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] whitespace-pre-wrap leading-relaxed">
                      {ans.text_answer || "(Empty response)"}
                    </div>
                  )}

                  {q?.question_type === "PROGRAMMING" && (
                    <pre className="p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] font-mono text-xs text-[#F5F7FA] overflow-x-auto whitespace-pre-wrap">
                      {ans.code_answer || "# No code submitted"}
                    </pre>
                  )}
                </div>

                {/* Question Feedback if Published */}
                {isPublished && ans.teacher_feedback && (
                  <div className="p-3.5 rounded-xl bg-[#F5BD45]/10 border border-[#F5BD45]/20 text-xs">
                    <span className="font-bold text-[#FFD978] block mb-1">Teacher Remarks:</span>
                    <p className="text-[#9AA6B5] whitespace-pre-wrap">{ans.teacher_feedback}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
