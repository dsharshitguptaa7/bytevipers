"use client";

import React, { useEffect, useState, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import {
  Clock, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
  Send, Save, Loader2, Code2, Check, FileQuestion
} from "lucide-react";
import ByteVipersLogo from "@/components/ByteVipersLogo";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function StudentTestAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const testId = Number(resolvedParams.id);
  const router = useRouter();

  const [attemptData, setAttemptData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, {
    selected_option?: string;
    text_response?: string;
    code_response?: string;
  }>>({});

  // Countdown timer state
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load attempt data
  useEffect(() => {
    async function loadAttempt() {
      try {
        const data = await api.getActiveTestAttempt(testId);
        setAttemptData(data);
        setSecondsLeft(data.remaining_seconds);

        // Prepopulate answers
        const initialAnswers: Record<number, any> = {};
        data.answers?.forEach((ans: any) => {
          initialAnswers[ans.question_id] = {
            selected_option: ans.selected_option || undefined,
            text_response: ans.text_response || "",
            code_response: ans.code_response || "",
          };
        });
        setUserAnswers(initialAnswers);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load active test attempt.");
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [testId]);

  // Handle countdown timer
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitOnExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleAutoSubmitOnExpiry = async () => {
    if (!attemptData?.attempt?.id) return;
    try {
      await api.submitTestAttempt(attemptData.attempt.id);
      alert("Time is up! Your answers have been submitted automatically.");
      router.push(`/tests/${testId}/result`);
    } catch {
      router.push(`/tests/${testId}/result`);
    }
  };

  // Helper to save current answer
  const saveCurrentAnswer = async (qId: number) => {
    if (!attemptData?.attempt?.id) return;
    setSavingAnswer(true);
    try {
      const ans = userAnswers[qId] || {};
      await api.saveTestAnswers(attemptData.attempt.id, [
        {
          question_id: qId,
          selected_option: ans.selected_option,
          text_response: ans.text_response,
          code_response: ans.code_response,
        },
      ]);
      setLastSavedTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Auto-save failed:", err);
    } finally {
      setSavingAnswer(false);
    }
  };

  const handleOptionChange = (qId: number, optKey: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], selected_option: optKey },
    }));
  };

  const handleTextChange = (qId: number, text: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], text_response: text },
    }));
  };

  const handleCodeChange = (qId: number, code: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], code_response: code },
    }));
  };

  const handleNext = async () => {
    const currentQ = questions[currentQIndex];
    if (currentQ) {
      await saveCurrentAnswer(currentQ.id);
    }
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    }
  };

  const handlePrev = async () => {
    const currentQ = questions[currentQIndex];
    if (currentQ) {
      await saveCurrentAnswer(currentQ.id);
    }
    if (currentQIndex > 0) {
      setCurrentQIndex((prev) => prev - 1);
    }
  };

  const handleManualSubmit = async () => {
    const answeredCount = questions.filter((q: any) => isAnswered(q.id)).length;
    const confirmText = `Are you sure you want to finish and submit this test?\n\nYou have answered ${answeredCount} of ${questions.length} questions. You cannot change your answers after submission.`;

    if (!window.confirm(confirmText)) return;

    setSubmittingTest(true);
    try {
      // Save current question answer first
      const currentQ = questions[currentQIndex];
      if (currentQ) {
        await saveCurrentAnswer(currentQ.id);
      }

      await api.submitTestAttempt(attemptData.attempt.id);
      router.push(`/tests/${testId}/result`);
    } catch (err: any) {
      alert("Submission error: " + (err.message || "Failed to submit test."));
      setSubmittingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-16 text-[#9AA6B5]">
        <ByteVipersLogo size={48} priority className="mb-4 animate-pulse glow-blue" />
        <div className="flex items-center gap-2 text-sm text-[#168BFF]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Preparing secure exam environment...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !attemptData) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center rounded-2xl cyber-card border border-[#1C2330]">
        <AlertTriangle className="w-12 h-12 mx-auto text-[#F5BD45] mb-3" />
        <h3 className="text-base font-bold text-[#F5F7FA]">Cannot Access Test</h3>
        <p className="text-xs text-[#9AA6B5] mt-1">{errorMsg || "Unable to start or resume test."}</p>
        <button
          onClick={() => router.push("/tests")}
          className="mt-4 px-4 py-2 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs font-bold text-[#168BFF] hover:border-[#168BFF]"
        >
          Return to Tests
        </button>
      </div>
    );
  }

  const { test, attempt } = attemptData;
  const questions = test?.questions || [];
  const currentQ = questions[currentQIndex];

  // Helper formatting for timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isAnswered = (qId: number) => {
    const ans = userAnswers[qId];
    if (!ans) return false;
    return (
      !!ans.selected_option ||
      (!!ans.text_response && ans.text_response.trim().length > 0) ||
      (!!ans.code_response && ans.code_response.trim().length > 0)
    );
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#050608]">
      {/* Top Test Header Bar */}
      <div className="h-14 px-6 bg-[#0B0E14] border-b border-[#1C2330] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <ByteVipersLogo size={28} priority />
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#168BFF]/10 text-[#36C5FF] border border-[#168BFF]/30 tracking-wider uppercase">
            Online Exam
          </span>
          <h2 className="text-sm font-extrabold text-[#F5F7FA] truncate max-w-md">{test.title}</h2>
        </div>

        {/* Timer Banner */}
        <div className="flex items-center gap-4">
          {lastSavedTime && (
            <span className="text-[11px] text-[#5F6B7C] hidden sm:inline">
              Saved at {lastSavedTime}
            </span>
          )}

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-xs ${
              (secondsLeft ?? 0) < 300
                ? "bg-red-500/15 border-red-500/40 text-red-400 animate-pulse"
                : "bg-[#10151D] border-[#F5BD45]/40 text-[#FFD978]"
            }`}
          >
            <Clock className="w-4 h-4 text-[#F5BD45]" />
            <span>Time Left: {secondsLeft !== null ? formatTime(secondsLeft) : "--:--"}</span>
          </div>

          <button
            onClick={handleManualSubmit}
            disabled={submittingTest}
            className="cyber-btn-gold px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 glow-gold"
          >
            {submittingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Submit Exam
          </button>
        </div>
      </div>

      {/* Main Split Test Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Question Navigator Palette (3 cols) */}
        <div className="lg:col-span-3 border-r border-[#1C2330] bg-[#0B0E14] p-4 flex flex-col justify-between overflow-y-auto">
          <div>
            <h3 className="text-xs font-bold text-[#9AA6B5] uppercase tracking-wider mb-3">
              Questions ({questions.length})
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q: any, idx: number) => {
                const answered = isAnswered(q.id);
                const isCurrent = idx === currentQIndex;

                return (
                  <button
                    key={q.id}
                    onClick={async () => {
                      if (currentQ) await saveCurrentAnswer(currentQ.id);
                      setCurrentQIndex(idx);
                    }}
                    className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                      isCurrent
                        ? "bg-[#168BFF] text-[#050608] ring-2 ring-[#36C5FF] shadow-[0_0_15px_rgba(22,139,255,0.4)]"
                        : answered
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-[#10151D] text-[#9AA6B5] border border-[#1C2330] hover:text-[#F5F7FA] hover:border-[#168BFF]/40"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#1C2330] space-y-2 text-[11px] text-[#5F6B7C]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#168BFF]" />
              <span className="text-[#9AA6B5]">Current Question</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
              <span className="text-[#9AA6B5]">Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#10151D] border border-[#1C2330]" />
              <span>Not Answered</span>
            </div>
          </div>
        </div>

        {/* Right: Active Question Workspace (9 cols) */}
        <div className="lg:col-span-9 flex flex-col h-full bg-[#050608] overflow-hidden">
          {currentQ ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Question Header */}
              <div className="p-5 border-b border-[#1C2330] bg-[#0B0E14] shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-extrabold text-[#36C5FF]">Question {currentQIndex + 1}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#10151D] text-[#9AA6B5] border border-[#1C2330] font-mono">
                    {currentQ.question_type}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-[#FFD978]">
                  {currentQ.marks} Marks
                </span>
              </div>

              {/* Question Statement & Answering Canvas */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#F5F7FA]">{currentQ.title}</h3>
                  <div className="mt-2 text-xs sm:text-sm text-[#9AA6B5] whitespace-pre-wrap leading-relaxed">
                    {currentQ.description}
                  </div>
                </div>

                {/* Question Type: Multiple Choice */}
                {currentQ.question_type === "MCQ" && currentQ.options && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-semibold text-[#5F6B7C] uppercase tracking-wider">Select one option:</p>
                    {Object.entries(currentQ.options).map(([key, val]) => {
                      const selected = userAnswers[currentQ.id]?.selected_option === key;
                      return (
                        <div
                          key={key}
                          onClick={() => handleOptionChange(currentQ.id, key)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                            selected
                              ? "bg-[#168BFF]/10 border-[#168BFF] text-[#F5F7FA] shadow-[0_0_15px_rgba(22,139,255,0.2)]"
                              : "bg-[#10151D] border-[#1C2330] text-[#9AA6B5] hover:border-[#168BFF]/40"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                              selected ? "border-[#168BFF] bg-[#168BFF] text-[#050608]" : "border-[#1C2330] text-[#5F6B7C]"
                            }`}
                          >
                            {key.toUpperCase()}
                          </div>
                          <span className="text-xs sm:text-sm">{String(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Question Type: Short Answer */}
                {currentQ.question_type === "SHORT_ANSWER" && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-[#5F6B7C] uppercase tracking-wider">Your Answer:</label>
                    <textarea
                      rows={3}
                      value={userAnswers[currentQ.id]?.text_response || ""}
                      onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                      placeholder="Type your concise answer here..."
                      className="w-full p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs sm:text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] resize-none"
                    />
                  </div>
                )}

                {/* Question Type: Long / Descriptive Answer */}
                {currentQ.question_type === "LONG_ANSWER" && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-[#5F6B7C] uppercase tracking-wider">Your Detailed Response:</label>
                    <textarea
                      rows={10}
                      value={userAnswers[currentQ.id]?.text_response || ""}
                      onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                      placeholder="Provide your in-depth explanation, steps, or derivations..."
                      className="w-full p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-xs sm:text-sm text-[#F5F7FA] placeholder-[#5F6B7C] focus:outline-none focus:border-[#168BFF] resize-none leading-relaxed"
                    />
                  </div>
                )}

                {/* Question Type: Programming Code */}
                {currentQ.question_type === "PROGRAMMING" && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#5F6B7C] uppercase tracking-wider">
                        Source Code ({currentQ.programming_language || "python"})
                      </label>
                      <span className="text-[11px] text-[#5F6B7C]">Auto-saved as draft</span>
                    </div>
                    <div className="h-80 rounded-xl border border-[#1C2330] overflow-hidden bg-[#0B0E14]">
                      <Editor
                        height="100%"
                        language={currentQ.programming_language || "python"}
                        theme="vs-dark"
                        value={
                          userAnswers[currentQ.id]?.code_response ??
                          currentQ.starter_code ??
                          "# Write your solution here\n"
                        }
                        onChange={(val) => handleCodeChange(currentQ.id, val || "")}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: "on",
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Control Bar */}
              <div className="h-16 px-6 bg-[#0B0E14] border-t border-[#1C2330] flex items-center justify-between shrink-0">
                <button
                  onClick={handlePrev}
                  disabled={currentQIndex === 0}
                  className="px-4 py-2 rounded-xl bg-[#10151D] text-xs font-bold text-[#9AA6B5] border border-[#1C2330] hover:bg-[#161D28] hover:text-[#F5F7FA] disabled:opacity-40 flex items-center gap-1 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveCurrentAnswer(currentQ.id)}
                    disabled={savingAnswer}
                    className="px-4 py-2 rounded-xl bg-[#10151D] text-xs font-semibold text-[#36C5FF] border border-[#168BFF]/30 hover:bg-[#168BFF]/10 flex items-center gap-1.5 transition-all"
                  >
                    {savingAnswer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Progress
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={currentQIndex === questions.length - 1}
                    className="cyber-btn-blue px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1 transition-all glow-blue"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#5F6B7C] text-xs">
              No questions found in this assessment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
