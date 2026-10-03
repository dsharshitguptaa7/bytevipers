"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  ArrowLeft, Plus, Save, Trash2, CheckCircle2, AlertTriangle,
  Loader2, FileQuestion, Code2, Award, Clock, BookOpen, Send, Terminal
} from "lucide-react";

export default function EditTeacherTestPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const testId = Number(resolvedParams.id);

  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingTest, setSavingTest] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Question builder state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [newQType, setNewQType] = useState<"MCQ" | "SHORT_ANSWER" | "LONG_ANSWER" | "PROGRAMMING">("MCQ");
  const [newQTitle, setNewQTitle] = useState("");
  const [newQDesc, setNewQDesc] = useState("");
  const [newQMarks, setNewQMarks] = useState<number>(10);
  const [newQOptions, setNewQOptions] = useState({ a: "", b: "", c: "", d: "" });
  const [newQCorrectOpt, setNewQCorrectOpt] = useState("a");
  const [newQLang, setNewQLang] = useState("python");
  const [newQStarterCode, setNewQStarterCode] = useState("def solve():\n    pass\n");

  const loadTest = async () => {
    setLoading(true);
    try {
      const data = await api.getTeacherTest(testId);
      setTest(data);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to load test." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTest();
  }, [testId]);

  const handleUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTest(true);
    setStatusMsg(null);
    try {
      const updated = await api.updateTeacherTest(testId, {
        title: test.title,
        description: test.description,
        instructions: test.instructions,
        duration_minutes: test.duration_minutes,
        total_marks: test.total_marks,
        status: test.status,
      });
      setTest(updated);
      setStatusMsg({ type: "success", text: "Test configuration saved successfully." });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to save test." });
    } finally {
      setSavingTest(false);
    }
  };

  const handleTogglePublish = async () => {
    try {
      const res = await api.publishTeacherTest(testId);
      setTest((prev: any) => ({ ...prev, status: res.status }));
      setStatusMsg({
        type: "success",
        text: `Test is now ${res.status}. Students can ${res.status === "PUBLISHED" ? "now see and take" : "no longer take"} this exam.`,
      });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to update publish state." });
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQTitle.trim()) return;

    setAddingQuestion(true);
    try {
      const qPayload: any = {
        title: newQTitle,
        description: newQDesc,
        question_type: newQType,
        marks: Number(newQMarks),
        order_index: (test.questions?.length || 0) + 1,
      };

      if (newQType === "MCQ") {
        qPayload.options = newQOptions;
        qPayload.correct_option = newQCorrectOpt;
      } else if (newQType === "PROGRAMMING") {
        qPayload.programming_language = newQLang;
        qPayload.starter_code = newQStarterCode;
      }

      await api.addTestQuestion(testId, qPayload);
      setShowAddModal(false);
      // Reset form
      setNewQTitle("");
      setNewQDesc("");
      setNewQOptions({ a: "", b: "", c: "", d: "" });
      setNewQMarks(10);
      await loadTest();
    } catch (err: any) {
      alert("Failed to add question: " + (err.message || "Unknown error"));
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (qId: number) => {
    if (!window.confirm("Remove this question from the test?")) return;
    try {
      await api.deleteTestQuestion(testId, qId);
      await loadTest();
    } catch (err: any) {
      alert("Failed to delete question: " + (err.message || "Unknown error"));
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-16 flex items-center justify-center text-[#9AA6B5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5BD45] mr-2" />
        <span className="text-sm">Loading test builder...</span>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center rounded-2xl cyber-card border border-[#1C2330]">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 mb-3" />
        <h3 className="text-base font-bold text-[#F5F7FA]">Test Not Found</h3>
        <Link href="/teacher/tests" className="mt-4 inline-block px-4 py-2 rounded-xl cyber-card text-xs font-bold text-[#F5BD45]">
          Back to Tests
        </Link>
      </div>
    );
  }

  const currentQuestionsTotalMarks = test.questions?.reduce((acc: number, q: any) => acc + (q.marks || 0), 0) || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/teacher/tests" className="inline-flex items-center gap-1.5 text-xs text-[#9AA6B5] hover:text-[#F5BD45] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Tests
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/teacher/tests/${testId}/attempts`}
            className="px-3.5 py-1.5 rounded-xl cyber-card text-xs font-bold text-[#36C5FF] border border-[#168BFF]/40 hover:bg-[#168BFF] hover:text-white transition-all"
          >
            View Student Attempts
          </Link>
          <button
            onClick={handleTogglePublish}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              test.status === "PUBLISHED"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}
          >
            Status: {test.status} (Click to toggle)
          </button>
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

      {/* Test Metadata Settings */}
      <div className="p-6 rounded-2xl cyber-card border border-[#1C2330] shadow-xl space-y-4">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#10151D] border border-[#F5BD45]/30 text-[#F5BD45] text-xs font-semibold mb-1">
          <Terminal className="w-3.5 h-3.5" />
          <span>ASSESSMENT CONFIGURATION</span>
        </div>
        <h2 className="text-base font-extrabold text-[#F5F7FA]">Test Parameters & Instructions</h2>
        <form onSubmit={handleUpdateTest} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#9AA6B5] mb-1">Title</label>
              <input
                type="text"
                required
                value={test.title}
                onChange={(e) => setTest({ ...test, title: e.target.value })}
                className="cyber-input w-full px-3 py-2 rounded-xl text-[#F5F7FA]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#9AA6B5] mb-1">Duration (Minutes)</label>
              <input
                type="number"
                min={5}
                value={test.duration_minutes}
                onChange={(e) => setTest({ ...test, duration_minutes: Number(e.target.value) })}
                className="cyber-input w-full px-3 py-2 rounded-xl text-[#F5F7FA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#9AA6B5] mb-1">Total Marks Allocated</label>
              <input
                type="number"
                min={1}
                value={test.total_marks}
                onChange={(e) => setTest({ ...test, total_marks: Number(e.target.value) })}
                className="cyber-input w-full px-3 py-2 rounded-xl text-[#F5F7FA]"
              />
            </div>
            <div className="flex items-end pb-1 text-[#9AA6B5]">
              <span>Sum of Question Marks: <strong className="text-[#F5BD45]">{currentQuestionsTotalMarks}</strong> / {test.total_marks} pts</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#9AA6B5] mb-1">Instructions</label>
            <textarea
              rows={3}
              value={test.instructions || ""}
              onChange={(e) => setTest({ ...test, instructions: e.target.value })}
              className="cyber-input w-full p-3 rounded-xl text-[#F5F7FA] resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingTest}
              className="cyber-btn-gold px-4 py-2 rounded-xl text-xs font-bold glow-gold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {savingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#F5F7FA]">Question Builder</h2>
            <p className="text-xs text-[#9AA6B5]">Manage questions included in this test ({test.questions?.length || 0} questions)</p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="cyber-btn-gold px-4 py-2 rounded-xl text-xs font-bold glow-gold flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>
        </div>

        {test.questions?.length === 0 ? (
          <div className="p-12 text-center rounded-2xl cyber-card border border-[#1C2330] text-[#9AA6B5]">
            <FileQuestion className="w-10 h-10 mx-auto text-[#5F6B7C] mb-2" />
            <h4 className="text-sm font-bold text-[#F5F7FA]">No Questions Added Yet</h4>
            <p className="text-xs text-[#5F6B7C] mt-1">Add your first question using the button above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {test.questions?.map((q: any, idx: number) => (
              <div
                key={q.id}
                className="p-4 rounded-xl cyber-card border border-[#1C2330] hover:border-[#F5BD45]/30 transition-all flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#10151D] text-[#36C5FF] border border-[#168BFF]/30">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0B0E14] text-[#9AA6B5] border border-[#1C2330]">
                      {q.question_type}
                    </span>
                    <span className="text-xs font-bold text-[#F5BD45] font-mono">
                      {q.marks} pts
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F5F7FA]">{q.title}</h4>
                  <p className="text-xs text-[#9AA6B5] line-clamp-2">{q.description}</p>
                </div>

                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all shrink-0"
                  title="Delete question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl cyber-card border border-[#1C2330] shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#F5F7FA] pb-3 border-b border-[#1C2330]">
              Add New Question
            </h3>

            <form onSubmit={handleAddQuestion} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#9AA6B5] mb-1">Question Format</label>
                  <select
                    value={newQType}
                    onChange={(e: any) => setNewQType(e.target.value)}
                    className="cyber-input w-full px-3 py-2 rounded-xl text-[#F5F7FA]"
                  >
                    <option value="MCQ">Multiple Choice Question (MCQ)</option>
                    <option value="SHORT_ANSWER">Short Answer / Concept</option>
                    <option value="LONG_ANSWER">Long / Descriptive Essay</option>
                    <option value="PROGRAMMING">Programming Code Challenge</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#9AA6B5] mb-1">Marks for this Question</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={newQMarks}
                    onChange={(e) => setNewQMarks(Number(e.target.value))}
                    className="cyber-input w-full px-3 py-2 rounded-xl text-[#F5F7FA]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#9AA6B5] mb-1">Question Title / Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Time complexity of binary search"
                  value={newQTitle}
                  onChange={(e) => setNewQTitle(e.target.value)}
                  className="cyber-input w-full px-3 py-2 rounded-xl text-[#F5F7FA]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#9AA6B5] mb-1">Detailed Prompt / Description</label>
                <textarea
                  rows={3}
                  placeholder="State the question clearly..."
                  value={newQDesc}
                  onChange={(e) => setNewQDesc(e.target.value)}
                  className="cyber-input w-full p-3 rounded-xl text-[#F5F7FA] resize-none"
                />
              </div>

              {/* Conditional: MCQ Options */}
              {newQType === "MCQ" && (
                <div className="space-y-3 p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330]">
                  <p className="font-bold text-[#F5F7FA]">MCQ Options & Correct Answer</p>
                  {(["a", "b", "c", "d"] as const).map((opt) => (
                    <div key={opt} className="flex items-center gap-2">
                      <span className="w-6 uppercase font-mono font-bold text-[#36C5FF]">{opt}:</span>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${opt.toUpperCase()} text`}
                        value={newQOptions[opt]}
                        onChange={(e) => setNewQOptions({ ...newQOptions, [opt]: e.target.value })}
                        className="cyber-input flex-1 px-3 py-1.5 rounded-lg text-[#F5F7FA]"
                      />
                    </div>
                  ))}

                  <div className="pt-2 flex items-center gap-3">
                    <span className="font-semibold text-[#9AA6B5]">Correct Option:</span>
                    {(["a", "b", "c", "d"] as const).map((opt) => (
                      <label key={opt} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="correct_option"
                          checked={newQCorrectOpt === opt}
                          onChange={() => setNewQCorrectOpt(opt)}
                          className="text-[#F5BD45] focus:ring-0"
                        />
                        <span className="uppercase font-mono text-[#F5F7FA]">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditional: Programming Code */}
              {newQType === "PROGRAMMING" && (
                <div className="space-y-3 p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330]">
                  <p className="font-bold text-[#F5F7FA]">Coding Challenge Parameters</p>
                  <div>
                    <label className="block text-[#9AA6B5] mb-1">Target Language</label>
                    <select
                      value={newQLang}
                      onChange={(e) => setNewQLang(e.target.value)}
                      className="cyber-input px-3 py-1.5 rounded-lg text-[#F5F7FA]"
                    >
                      <option value="python">Python 3</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#9AA6B5] mb-1">Starter Code Template</label>
                    <textarea
                      rows={4}
                      value={newQStarterCode}
                      onChange={(e) => setNewQStarterCode(e.target.value)}
                      className="cyber-input w-full p-2.5 rounded-lg font-mono text-[#F5F7FA] resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[#1C2330] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl cyber-card text-[#9AA6B5] hover:text-[#F5F7FA] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingQuestion}
                  className="cyber-btn-gold px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 glow-gold disabled:opacity-50"
                >
                  {addingQuestion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Question</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
