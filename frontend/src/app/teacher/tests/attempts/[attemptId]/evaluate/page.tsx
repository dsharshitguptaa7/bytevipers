"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ArrowLeft, Award, CheckCircle2, AlertTriangle, Save,
  Send, Loader2, Copy, Check, MessageSquare, BookOpen, Clock
} from "lucide-react";

export default function TeacherEvaluateAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const resolvedParams = use(params);
  const attemptId = Number(resolvedParams.attemptId);
  const router = useRouter();

  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);

  // Form states
  const [scores, setScores] = useState<Record<string, { marks: number | string; feedback: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAttempt = async () => {
    setLoading(true);
    try {
      const data = await api.getTeacherTestAttempt(attemptId);
      setAttempt(data);
      setOverallFeedback(data.feedback || "");

      // Prepopulate scores from existing answers
      const initialScores: Record<string, { marks: number | string; feedback: string }> = {};
      data.answers?.forEach((ans: any) => {
        initialScores[ans.question_id.toString()] = {
          marks: ans.score !== null && ans.score !== undefined ? ans.score : "",
          feedback: ans.teacher_feedback || "",
        };
      });
      setScores(initialScores);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to load candidate attempt." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttempt();
  }, [attemptId]);

  const handleScoreChange = (qId: number, marks: string) => {
    setScores((prev) => ({
      ...prev,
      [qId.toString()]: {
        ...prev[qId.toString()],
        marks,
      },
    }));
  };

  const handleFeedbackChange = (qId: number, feedback: string) => {
    setScores((prev) => ({
      ...prev,
      [qId.toString()]: {
        ...prev[qId.toString()],
        feedback,
      },
    }));
  };

  const handleCopyCode = (qId: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(qId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleSaveEvaluation = async (publish: boolean) => {
    setSaving(true);
    setStatusMsg(null);

    // Validate and format question scores
    const formattedScores: Record<string, { marks: number; feedback?: string }> = {};
    for (const ans of attempt.answers || []) {
      const qIdStr = ans.question_id.toString();
      const current = scores[qIdStr];
      const maxMarks = ans.question?.marks || 10;
      const numMarks = current?.marks !== "" && current?.marks !== undefined ? Number(current.marks) : 0;

      if (isNaN(numMarks) || numMarks < 0 || numMarks > maxMarks) {
        setStatusMsg({
          type: "error",
          text: `Marks for Question #${ans.question?.order_index || qIdStr} must be between 0 and ${maxMarks}.`,
        });
        setSaving(false);
        return;
      }

      formattedScores[qIdStr] = {
        marks: numMarks,
        feedback: current?.feedback || undefined,
      };
    }

    try {
      const updated = await api.evaluateTeacherTestAttempt(attemptId, {
        question_scores: formattedScores,
        overall_feedback: overallFeedback,
        publish,
      });

      setAttempt(updated);
      setStatusMsg({
        type: "success",
        text: publish
          ? "Evaluation published successfully! Candidate can now view their report card and feedback."
          : "Evaluation draft saved successfully.",
      });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to save evaluation." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-16 flex items-center justify-center text-[#9AA6B5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5BD45] mr-2" />
        <span className="text-sm">Loading candidate answer sheet...</span>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center rounded-2xl cyber-card border border-[#1C2330]">
        <AlertTriangle className="w-12 h-12 mx-auto text-[#F5BD45] mb-3" />
        <h3 className="text-base font-bold text-[#F5F7FA]">Attempt Not Found</h3>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs font-bold text-[#FFD978] hover:border-[#F5BD45]"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Calculate live total score
  const computedTotalScore = Object.values(scores).reduce((sum, item) => {
    const val = Number(item?.marks);
    return isNaN(val) ? sum : sum + val;
  }, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href={`/teacher/tests/${attempt.test_id}/attempts`}
        className="inline-flex items-center gap-1.5 text-xs text-[#9AA6B5] hover:text-[#F5F7FA] transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-[#F5BD45]" /> Back to Candidate Attempts
      </Link>

      {/* Candidate & Test Header */}
      <div className="cyber-card p-6 rounded-2xl space-y-4 glow-gold relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F5BD45] to-transparent" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30">
                Attempt #{attempt.id}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#0B0E14] text-[#9AA6B5] border border-[#1C2330]">
                Status: {attempt.status}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-[#F5F7FA]">
              Candidate: {attempt.student_name} ({attempt.student_email})
            </h1>
            <p className="text-xs text-[#9AA6B5] mt-0.5">
              Assessment: <span className="text-[#F5F7FA] font-semibold">{attempt.test_title}</span> • Submitted: {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "Not submitted yet"}
            </p>
          </div>

          {/* Running Total Score Box */}
          <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-center min-w-[150px]">
            <div className="text-[10px] uppercase font-semibold text-[#5F6B7C]">Assigned Marks</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
              {computedTotalScore} <span className="text-xs text-[#5F6B7C] font-normal">/ {attempt.max_score}</span>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border-red-500/30"
            }`}
          >
            {statusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* Answer Sheet Questions Evaluation List */}
      <div className="space-y-6">
        <h2 className="text-sm font-bold text-[#F5F7FA] uppercase tracking-wider">
          Answer Sheet Responses & Question Grading
        </h2>

        {attempt.answers?.map((ans: any, idx: number) => {
          const q = ans.question;
          const qIdStr = ans.question_id.toString();
          const currentScore = scores[qIdStr]?.marks ?? "";
          const currentFeedback = scores[qIdStr]?.feedback ?? "";

          return (
            <div
              key={ans.id || idx}
              className="cyber-card p-6 rounded-2xl space-y-4"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1C2330]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30">
                    Q{idx + 1}
                  </span>
                  <span className="text-xs font-mono text-[#5F6B7C]">{q?.question_type}</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#FFD978]">
                  Max Marks: {q?.marks} pts
                </span>
              </div>

              {/* Prompt */}
              <div>
                <h4 className="text-sm font-bold text-[#F5F7FA]">{q?.title}</h4>
                <p className="text-xs text-[#9AA6B5] mt-1 whitespace-pre-wrap leading-relaxed">{q?.description}</p>
              </div>

              {/* Student Response Display */}
              <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B7C] block">
                  Candidate&apos;s Submitted Answer:
                </span>

                {/* MCQ Question Response */}
                {q?.question_type === "MCQ" && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-[#9AA6B5]">Candidate Choice:</span>
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#10151D] text-[#36C5FF] border border-[#1C2330]">
                        {ans.selected_option ? ans.selected_option.toUpperCase() : "None"}
                      </span>
                    </div>

                    {q.correct_option && (
                      <div className="flex items-center gap-3 text-emerald-400">
                        <span>Correct Answer:</span>
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                          {q.correct_option.toUpperCase()}
                        </span>
                        {ans.selected_option?.toLowerCase() === q.correct_option.toLowerCase() && (
                          <span className="text-[11px] font-semibold text-emerald-300">
                            (Matches Correct Answer)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Short / Long Answer */}
                {(q?.question_type === "SHORT_ANSWER" || q?.question_type === "LONG_ANSWER") && (
                  <p className="text-xs sm:text-sm text-[#F5F7FA] whitespace-pre-wrap leading-relaxed select-text">
                    {ans.text_answer || "(No response submitted)"}
                  </p>
                )}

                {/* Programming Code */}
                {q?.question_type === "PROGRAMMING" && (
                  <div>
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[10px] text-[#5F6B7C] font-mono">
                        Language: {ans.language || "python"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(ans.question_id, ans.code_answer || "")}
                        className="px-2 py-0.5 rounded bg-[#10151D] text-[10px] text-[#36C5FF] flex items-center gap-1 border border-[#168BFF]/30 hover:bg-[#168BFF]/10 transition-colors"
                      >
                        {copiedCodeId === ans.question_id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedCodeId === ans.question_id ? "Copied" : "Copy Code"}
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-lg bg-[#050608] border border-[#1C2330] font-mono text-xs text-[#F5F7FA] overflow-x-auto whitespace-pre-wrap select-text">
                      {ans.code_answer || "# No code submitted"}
                    </pre>
                  </div>
                )}
              </div>

              {/* Grading Box */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#9AA6B5] mb-1">
                    Award Marks (0 - {q?.marks || 10})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={q?.marks || 10}
                    step={0.5}
                    value={currentScore}
                    onChange={(e) => handleScoreChange(ans.question_id, e.target.value)}
                    placeholder={`0 - ${q?.marks}`}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs font-bold text-[#F5F7FA] focus:outline-none focus:border-[#F5BD45]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-[#9AA6B5] mb-1">
                    Question Remarks / Specific Feedback
                  </label>
                  <input
                    type="text"
                    value={currentFeedback}
                    onChange={(e) => handleFeedbackChange(ans.question_id, e.target.value)}
                    placeholder="e.g. Good logic, missed corner case where n=0..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Assessment Remarks & Actions */}
      <div className="cyber-card p-6 rounded-2xl space-y-4 glow-gold">
        <h3 className="text-sm font-bold text-[#F5F7FA] uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#F5BD45]" />
          <span>Overall Candidate Feedback & Result Publishing</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5">
            Teacher Summary Remarks (Visible on Candidate&apos;s Report Card)
          </label>
          <textarea
            rows={4}
            value={overallFeedback}
            onChange={(e) => setOverallFeedback(e.target.value)}
            placeholder="Write a constructive summary of candidate performance, strengths, and areas to improve..."
            className="w-full p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#F5BD45] resize-none"
          />
        </div>

        <div className="pt-4 border-t border-[#1C2330] flex items-center justify-between">
          <Link
            href={`/teacher/tests/${attempt.test_id}/attempts`}
            className="px-4 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-[#9AA6B5] hover:text-[#F5F7FA] font-bold text-xs transition-colors"
          >
            Cancel
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSaveEvaluation(false)}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] hover:border-[#F5BD45]/40 text-[#F5F7FA] font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-[#F5BD45]" /> Save Evaluation Draft
            </button>

            <button
              onClick={() => handleSaveEvaluation(true)}
              disabled={saving}
              className="cyber-btn-gold px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 glow-gold"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Publish Results to Candidate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
