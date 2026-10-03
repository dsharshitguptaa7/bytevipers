"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Play, Send, RotateCcw, CheckCircle2, XCircle, AlertTriangle,
  Clock, Terminal, Code2, Layers, Cpu, ChevronDown, Loader2,
  ShieldAlert, Save, Award, MessageSquare, History, Check, Lock
} from "lucide-react";

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function ProblemWorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const searchParams = useSearchParams();
  const assignmentIdParam = searchParams.get("assignment_id");
  const assignmentId = assignmentIdParam ? parseInt(assignmentIdParam, 10) : undefined;
  const tabParam = searchParams.get("tab");
  const { user } = useAuth();

  const [problem, setProblem] = useState<any>(null);
  const [language, setLanguage] = useState<string>("python");
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"samples" | "custom" | "submissions">(
    tabParam === "submissions" ? "submissions" : "samples"
  );
  const [customInput, setCustomInput] = useState<string>("");
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);

  // Draft and Submission states
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedMessage, setDraftSavedMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<any | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    async function loadProblemAndDraft() {
      try {
        const data = await api.getProblem(slug);
        setProblem(data);
        setCode(data.starter_code || "def solve():\n    pass\n");

        // Try loading student draft if logged in
        if (user) {
          try {
            const draft = await api.getSubmissionDraft(data.id);
            if (draft && draft.source_code) {
              setCode(draft.source_code);
              if (draft.language) setLanguage(draft.language);
            }
          } catch {
            // No active draft or unauthenticated
          }

          // Load submissions history
          loadHistory(data.id);
        }
      } catch (err) {
        console.error("Failed to load problem:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProblemAndDraft();
  }, [slug, user]);

  const loadHistory = async (problemId: number) => {
    setLoadingHistory(true);
    try {
      const history = await api.getMySubmissionHistory(problemId);
      setMySubmissions(history);
      const finalSub = history.find((s: any) => !s.is_draft);
      if (finalSub && finalSub.source_code) {
        setCode(finalSub.source_code);
        if (finalSub.language) setLanguage(finalSub.language);
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  const existingFinalSub = mySubmissions.find((s: any) => !s.is_draft);
  const isAlreadySubmitted = Boolean(existingFinalSub);

  const handleResetCode = () => {
    if (isAlreadySubmitted) return;
    if (window.confirm("Reset code back to the original starter template?")) {
      setCode(problem?.starter_code || "def solve():\n    pass\n");
    }
  };

  const handleSaveDraft = async () => {
    if (!problem || !user || isAlreadySubmitted) return;
    setSavingDraft(true);
    setDraftSavedMessage(null);
    try {
      await api.saveSubmissionDraft({
        problem_id: problem.id,
        language,
        source_code: code,
        assignment_id: assignmentId,
      });
      setDraftSavedMessage("Draft saved successfully!");
      setTimeout(() => setDraftSavedMessage(null), 3500);
    } catch (err: any) {
      alert("Failed to save draft: " + (err.message || "Unknown error"));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!problem || !user || isAlreadySubmitted) return;
    setSubmitting(true);
    setSubmissionSuccess(null);
    setSubmissionError(null);
    setActiveTab("submissions");

    try {
      const res = await api.submitCode({
        problem_id: problem.id,
        language,
        source_code: code,
        assignment_id: assignmentId,
      });
      setSubmissionSuccess(res);
      await loadHistory(problem.id);
    } catch (err: any) {
      setSubmissionError(err.message || "Failed to submit solution.");
      await loadHistory(problem.id);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#94A3B8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#38BDF8] mb-2" />
        <span className="ml-3 text-sm">Entering Coding Arena...</span>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-center text-[#94A3B8]">
        <div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">Problem Not Found</h2>
          <p className="text-xs mt-1">The requested challenge does not exist or is unpublished.</p>
          <Link href="/problems" className="mt-4 inline-block px-4 py-2 rounded-xl bg-[#38BDF8] text-[#0B1020] font-bold text-xs">
            Back to Problem Library
          </Link>
        </div>
      </div>
    );
  }

  const isVerified = user && (user.role === "teacher" || (user.verification_status || "").toLowerCase() === "approved");

  // Get Monaco language identifier
  const getMonacoLanguage = (lang: string) => {
    switch (lang) {
      case "cpp": return "cpp";
      case "java": return "java";
      case "javascript": return "javascript";
      case "python":
      default: return "python";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#050608]">
      {/* Verification Gate Alert if not verified */}
      {!isVerified && (
        <div className="bg-[#10151D] border-b border-[#F5BD45]/40 px-4 py-2 flex items-center justify-between text-xs text-[#FFD978]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#F5BD45]" />
            <span>
              {!user
                ? "You are in visitor preview mode. Sign in with an approved student account to submit solutions."
                : `Your student verification status is currently ${
                    (user.verification_status || "").toLowerCase() === "pending"
                      ? "Pending Review"
                      : (user.verification_status || "").toLowerCase() === "rejected"
                      ? "Rejected"
                      : "Not Submitted"
                  }. Approval is required before submitting solutions.`}
            </span>
          </div>
          <Link
            href={user ? "/verify-student" : "/login"}
            className="font-bold underline hover:text-[#FFD978] ml-4 shrink-0"
          >
            {user ? "View Verification Status" : "Log In"}
          </Link>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-[#050608]">
        {/* Left Column: Problem Statement & Test Cases (5 cols) */}
        <div className="lg:col-span-5 border-r border-[#1C2330] bg-[#0B0E14] flex flex-col h-full overflow-hidden">
          {/* Problem Meta Header */}
          <div className="p-5 border-b border-[#1C2330] shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  problem.difficulty === "Easy"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : problem.difficulty === "Medium"
                    ? "bg-[#F5BD45]/10 text-[#FFD978] border border-[#F5BD45]/30"
                    : "bg-red-500/10 text-red-400 border border-red-500/30"
                }`}
              >
                {problem.difficulty}
              </span>
              <div className="flex items-center gap-3 text-xs text-[#5F6B7C] font-mono">
                <span className="text-[#36C5FF] font-bold">Max Marks: {problem.max_marks || 100}</span>
                <span>⏱ {problem.time_limit_ms}ms</span>
              </div>
            </div>
            <h1 className="text-xl font-extrabold text-[#F5F7FA] mt-2">{problem.title}</h1>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {problem.tags?.map((t: any) => (
                <span key={t.id} className="text-[10px] px-2 py-0.5 rounded bg-[#10151D] text-[#9AA6B5] border border-[#1C2330]">
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          {/* Scrollable Problem Description */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm text-[#F8FAFC] leading-relaxed">
            {/* Description */}
            <div>
              <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Description</h3>
              <p className="whitespace-pre-wrap text-xs sm:text-sm text-[#CBD5E1]">{problem.description}</p>
            </div>

            {/* Input & Output Specifications */}
            {problem.input_description && (
              <div>
                <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Input Format</h3>
                <p className="whitespace-pre-wrap text-xs sm:text-sm text-[#CBD5E1] bg-[#111827] p-3 rounded-xl border border-[#1E293B]">
                  {problem.input_description}
                </p>
              </div>
            )}

            {problem.output_description && (
              <div>
                <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Output Format</h3>
                <p className="whitespace-pre-wrap text-xs sm:text-sm text-[#CBD5E1] bg-[#111827] p-3 rounded-xl border border-[#1E293B]">
                  {problem.output_description}
                </p>
              </div>
            )}

            {/* Constraints */}
            {problem.constraints && (
              <div>
                <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Constraints</h3>
                <div className="font-mono text-xs bg-[#111827] p-3 rounded-xl border border-[#1E293B] text-[#F5B942] whitespace-pre-wrap">
                  {problem.constraints}
                </div>
              </div>
            )}

            {/* Sample Cases */}
            <div>
              <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Sample Test Cases</h3>
              <div className="space-y-4">
                {problem.sample_cases?.map((sample: any, idx: number) => (
                  <div key={sample.id || idx} className="rounded-xl bg-[#111827] border border-[#1E293B] overflow-hidden">
                    <div className="px-3.5 py-1.5 bg-[#182235] text-[11px] font-bold text-[#38BDF8]">
                      Sample Case {idx + 1}
                    </div>
                    <div className="p-3.5 space-y-2 text-xs font-mono">
                      <div>
                        <span className="text-[#64748B] block text-[10px] uppercase">Input</span>
                        <pre className="bg-[#0B1020] p-2 rounded text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap">{sample.input_data}</pre>
                      </div>
                      <div>
                        <span className="text-[#64748B] block text-[10px] uppercase">Expected Output</span>
                        <pre className="bg-[#0B1020] p-2 rounded text-emerald-400 overflow-x-auto whitespace-pre-wrap">{sample.expected_output}</pre>
                      </div>
                      {sample.sample_explanation && (
                        <div className="pt-1 text-[11px] font-sans text-[#94A3B8]">
                          <span className="text-[#F5B942] font-semibold">Explanation: </span>
                          {sample.sample_explanation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor & Submission Console (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-[#10151D] overflow-hidden">
          {/* Editor Action Header */}
          <div className="h-12 px-4 bg-[#0B0E14] border-b border-[#1C2330] flex items-center justify-between shrink-0">
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#36C5FF]" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-2.5 py-1 rounded-md bg-[#161D28] text-xs font-mono font-bold text-[#36C5FF] border border-[#168BFF]/40 focus:outline-none"
              >
                <option value="python">Python 3.x</option>
                <option value="cpp">C++ (GCC)</option>
                <option value="java">Java (OpenJDK)</option>
                <option value="javascript">JavaScript (Node)</option>
              </select>

              {draftSavedMessage && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" /> {draftSavedMessage}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetCode}
                disabled={isAlreadySubmitted}
                className="p-1.5 rounded-lg text-[#9AA6B5] hover:text-[#F5F7FA] hover:bg-[#161D28] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Reset starter template"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleSaveDraft}
                disabled={savingDraft || !isVerified || isAlreadySubmitted}
                className="px-3.5 py-1.5 rounded-lg bg-[#161D28] hover:bg-[#1C2433] border border-[#1C2330] hover:border-[#168BFF]/50 text-[#F5F7FA] font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#36C5FF]" />}
                Save Draft
              </button>

              {/* Run Code disabled during manual evaluation phase */}
              <button
                disabled
                title="Automated execution temporarily sidelined for manual evaluation phase"
                className="px-3.5 py-1.5 rounded-lg bg-[#161D28]/40 border border-[#1C2330] text-[#5F6B7C] font-semibold text-xs transition-all flex items-center gap-1.5 cursor-not-allowed opacity-60"
              >
                <Play className="w-3.5 h-3.5 fill-current opacity-40" />
                Run Code <span className="text-[10px] hidden sm:inline">(Sidelined)</span>
              </button>

              {isAlreadySubmitted ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5 font-mono shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {existingFinalSub?.status === "PUBLISHED" || existingFinalSub?.status === "EVALUATED"
                      ? `Evaluated (${existingFinalSub?.marks ?? 0}/${existingFinalSub?.max_marks ?? 100} pts)`
                      : existingFinalSub?.status === "UNDER_REVIEW"
                      ? "Under Review"
                      : "Submitted (Locked)"}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleSubmitSolution}
                  disabled={submitting || !isVerified}
                  className="px-4 py-1.5 rounded-lg cyber-btn-gold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(245,189,69,0.3)]"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#050608]" /> : <Send className="w-3.5 h-3.5 text-[#050608]" />}
                  Submit Solution
                </button>
              )}
            </div>
          </div>

          {/* Locked Status Banner if Already Submitted */}
          {isAlreadySubmitted && (
            <div className="bg-[#0B0E14] border-b border-[#1C2330] px-4 py-2 flex items-center justify-between text-xs text-[#9AA6B5]">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#36C5FF] shrink-0" />
                <span className="text-[#F5F7FA]">
                  {existingFinalSub?.status === "PUBLISHED" || existingFinalSub?.status === "EVALUATED"
                    ? `This problem was evaluated by your instructor (Marks: ${existingFinalSub?.marks ?? 0}/${existingFinalSub?.max_marks ?? 100}).`
                    : "Solution received and saved persistently. Resubmission is locked."}
                </span>
              </div>
              <button
                onClick={() => setActiveTab("submissions")}
                className="text-[#36C5FF] hover:underline font-semibold text-xs ml-4 cursor-pointer"
              >
                View Marks &amp; Feedback →
              </button>
            </div>
          )}

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[300px] relative bg-[#050608]">
            <Editor
              height="100%"
              language={getMonacoLanguage(language)}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "var(--font-geist-mono), 'Courier New', monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                readOnly: isAlreadySubmitted,
              }}
            />
          </div>

          {/* Bottom Execution Console & Results Panel */}
          <div className="h-64 border-t border-[#1C2330] bg-[#0B0E14] flex flex-col shrink-0">
            {/* Tabs */}
            <div className="h-9 px-4 bg-[#10151D] border-b border-[#1C2330] flex items-center gap-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("samples")}
                className={`h-full border-b-2 transition-colors cursor-pointer ${
                  activeTab === "samples"
                    ? "border-[#168BFF] text-[#36C5FF]"
                    : "border-transparent text-[#9AA6B5] hover:text-[#F5F7FA]"
                }`}
              >
                Sample Cases
              </button>
              <button
                onClick={() => setActiveTab("custom")}
                className={`h-full border-b-2 transition-colors cursor-pointer ${
                  activeTab === "custom"
                    ? "border-[#168BFF] text-[#36C5FF]"
                    : "border-transparent text-[#9AA6B5] hover:text-[#F5F7FA]"
                }`}
              >
                Custom Input
              </button>
              <button
                onClick={() => setActiveTab("submissions")}
                className={`h-full border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "submissions"
                    ? "border-[#F5BD45] text-[#FFD978]"
                    : "border-transparent text-[#9AA6B5] hover:text-[#F5F7FA]"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Submissions &amp; Evaluation
                {mySubmissions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#161D28] text-[#36C5FF]">
                    {mySubmissions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
              {activeTab === "samples" && (
                <div className="space-y-3">
                  <div className="flex gap-2 mb-2">
                    {problem.sample_cases?.map((_: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedSampleIndex(i)}
                        className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                          selectedSampleIndex === i
                            ? "bg-[#168BFF] text-[#F5F7FA] shadow-[0_0_10px_rgba(22,139,255,0.3)]"
                            : "bg-[#161D28] text-[#9AA6B5] hover:text-white"
                        }`}
                      >
                        Case {i + 1}
                      </button>
                    ))}
                  </div>
                  {problem.sample_cases?.[selectedSampleIndex] && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[#64748B] text-[11px] block">Input</span>
                        <pre className="p-2.5 rounded bg-[#111827] border border-[#1E293B] text-[#F8FAFC] whitespace-pre-wrap">
                          {problem.sample_cases[selectedSampleIndex].input_data}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[#64748B] text-[11px] block">Expected Output</span>
                        <pre className="p-2.5 rounded bg-[#111827] border border-[#1E293B] text-emerald-400 whitespace-pre-wrap">
                          {problem.sample_cases[selectedSampleIndex].expected_output}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "custom" && (
                <div className="h-full flex flex-col">
                  <span className="text-[#64748B] text-[11px] mb-1">Standard Input (stdin):</span>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter custom input values to feed into sys.stdin..."
                    className="flex-1 w-full p-2.5 rounded bg-[#111827] border border-[#1E293B] text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8] resize-none"
                  />
                </div>
              )}

              {activeTab === "submissions" && (
                <div className="space-y-4 font-sans">
                  {/* Alert on Recent Submit */}
                  {submissionSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="font-bold">Solution Submitted Successfully!</p>
                          <p className="text-[11px] text-emerald-300">
                            Your code is queued for instructor evaluation. Check back once your teacher publishes your marks and feedback.
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 font-bold">
                        {submissionSuccess.status || "SUBMITTED"}
                      </span>
                    </div>
                  )}

                  {submissionError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{submissionError}</span>
                    </div>
                  )}

                  {/* Submission History List */}
                  {loadingHistory ? (
                    <div className="py-6 flex items-center justify-center text-xs text-[#64748B]">
                      <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#38BDF8]" /> Loading submission history...
                    </div>
                  ) : mySubmissions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#64748B]">
                      <p>You have not submitted a solution for this problem yet.</p>
                      <p className="mt-1">Write your solution in the editor and click &quot;Submit Solution&quot;.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mySubmissions.map((sub: any) => (
                        <div
                          key={sub.id}
                          className="p-3.5 rounded-xl bg-[#111827] border border-[#1E293B] space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#F8FAFC]">Submission #{sub.id}</span>
                              <span className="font-mono uppercase text-[10px] px-2 py-0.5 rounded bg-[#182235] text-[#38BDF8]">
                                {sub.language || "python"}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  sub.status === "PUBLISHED"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                                }`}
                              >
                                {sub.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#64748B]">
                              {new Date(sub.submitted_at || sub.created_at).toLocaleString()}
                            </span>
                          </div>

                          {/* Evaluation Status & Marks */}
                          {(sub.status === "PUBLISHED" || sub.status === "EVALUATED" || (sub.marks !== null && sub.marks !== undefined)) ? (
                            <div className="mt-2 pt-2 border-t border-[#1E293B] grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-[#F5B942]" />
                                <span className="text-xs text-[#94A3B8]">Marks:</span>
                                <span className="text-sm font-extrabold text-emerald-400 font-mono">
                                  {sub.marks ?? 0} / {sub.max_marks || 100}
                                </span>
                              </div>
                              {sub.teacher_feedback ? (
                                <div className="sm:col-span-2 bg-[#0B1020] p-2.5 rounded-lg border border-[#1E293B] text-xs">
                                  <div className="flex items-center gap-1.5 text-[#38BDF8] font-bold mb-1">
                                    <MessageSquare className="w-3.5 h-3.5" /> Teacher Feedback:
                                  </div>
                                  <p className="text-[#CBD5E1] whitespace-pre-wrap">{sub.teacher_feedback}</p>
                                </div>
                              ) : (
                                <div className="sm:col-span-2 text-[11px] text-[#5F6B7C] italic">
                                  No written remarks provided.
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#64748B] italic">
                              Evaluation status: Pending instructor review. Marks and feedback will be published here upon completion.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
