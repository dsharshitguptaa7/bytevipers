"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  FileCode2, Search, Filter, CheckCircle2, Clock,
  Eye, X, Loader2, Copy, Check, Send, Award, MessageSquare, Terminal
} from "lucide-react";

export default function TeacherSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states for manual grading
  const [marksInput, setMarksInput] = useState<number | string>("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await api.listTeacherSubmissions({
        status: statusFilter || undefined,
        language: languageFilter || undefined,
        search: searchQuery || undefined,
      });
      setSubmissions(data);
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter, languageFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSubmissions();
  };

  const handleInspect = async (subId: number) => {
    setLoadingDetail(true);
    setFeedbackMsg(null);
    try {
      const detail = await api.getTeacherSubmission(subId);
      setSelectedSub(detail);
      setMarksInput(detail.marks !== null && detail.marks !== undefined ? detail.marks : "");
      setFeedbackInput(detail.teacher_feedback || "");
    } catch (err: any) {
      alert("Failed to load submission details: " + (err.message || "Unknown error"));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCopyCode = () => {
    if (!selectedSub?.source_code) return;
    navigator.clipboard.writeText(selectedSub.source_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEvaluation = async (publish: boolean) => {
    if (!selectedSub) return;
    const maxMarks = selectedSub.max_marks || 100;
    const marksNum = Number(marksInput);

    if (marksInput === "" || isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks) {
      setFeedbackMsg({
        type: "error",
        text: `Please enter valid marks between 0 and ${maxMarks}.`,
      });
      return;
    }

    setEvaluating(true);
    setFeedbackMsg(null);

    try {
      const updated = await api.evaluateTeacherSubmission(selectedSub.id, {
        marks: marksNum,
        teacher_feedback: feedbackInput,
        publish,
      });

      setSelectedSub(updated);
      setFeedbackMsg({
        type: "success",
        text: publish
          ? "Evaluation published successfully! The student can now view their marks and remarks."
          : "Evaluation draft saved.",
      });

      // Update in table list
      setSubmissions((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
      );
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err.message || "Failed to update evaluation.",
      });
    } finally {
      setEvaluating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "EVALUATED":
        return "bg-[#F5BD45]/10 text-[#F5BD45] border-[#F5BD45]/30";
      case "UNDER_REVIEW":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "SUBMITTED":
        return "bg-[#168BFF]/10 text-[#36C5FF] border-[#168BFF]/30";
      case "DRAFT":
      default:
        return "bg-gray-500/10 text-[#9AA6B5] border-gray-500/30";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-6 border-b border-[#1C2330] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#10151D] border border-[#F5BD45]/30 text-[#F5BD45] text-xs font-semibold mb-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>SUBMISSIONS BENCHMARK</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Coding Submissions & Manual Evaluation</h1>
          <p className="text-xs text-[#9AA6B5] mt-1">
            Review student code submissions, assign marks, provide detailed remarks, and publish results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-medium cyber-card border border-[#1C2330] text-[#36C5FF]">
            {submissions.length} Total Submissions
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F6B7C]" />
          <input
            type="text"
            placeholder="Search by student name, email, or problem title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="cyber-input w-full pl-10 pr-4 py-2.5 rounded-xl text-xs text-[#F5F7FA]"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="cyber-input px-3.5 py-2.5 rounded-xl text-xs text-[#F5F7FA]"
        >
          <option value="">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="EVALUATED">Evaluated (Draft)</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Student Draft</option>
        </select>

        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="cyber-input px-3.5 py-2.5 rounded-xl text-xs text-[#F5F7FA]"
        >
          <option value="">All Languages</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="javascript">JavaScript</option>
        </select>
      </div>

      {/* Submissions Table */}
      <div className="rounded-2xl cyber-card border border-[#1C2330] overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 flex items-center justify-center text-[#9AA6B5]">
            <Loader2 className="w-6 h-6 animate-spin text-[#F5BD45] mr-2" />
            <span className="text-xs">Loading submissions...</span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-16 text-center text-[#9AA6B5]">
            <FileCode2 className="w-10 h-10 mx-auto text-[#5F6B7C] mb-2" />
            <h3 className="text-sm font-bold text-[#F5F7FA]">No Submissions Found</h3>
            <p className="text-xs text-[#5F6B7C] mt-1">There are no submissions matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050608] text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                <tr>
                  <th className="py-3 px-6">Student</th>
                  <th className="py-3 px-6">Problem</th>
                  <th className="py-3 px-6">Language</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Marks Awarded</th>
                  <th className="py-3 px-6 text-right">Submitted</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2330]">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#161D28]/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-[#F5F7FA]">{sub.student_name || `User #${sub.user_id}`}</div>
                      <div className="text-[11px] text-[#5F6B7C]">{sub.student_email}</div>
                    </td>
                    <td className="py-4 px-6 font-medium text-[#F5F7FA]">
                      {sub.problem_title || `Problem #${sub.problem_id}`}
                      <div className="text-[10px] text-[#5F6B7C]">Max: {sub.max_marks || 100} pts</div>
                    </td>
                    <td className="py-4 px-6 font-mono text-[#36C5FF]">
                      {sub.language || "python"}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono">
                      {sub.marks !== null && sub.marks !== undefined ? (
                        <span className="font-bold text-[#F5BD45]">
                          {sub.marks} / {sub.max_marks || 100}
                        </span>
                      ) : (
                        <span className="text-[#5F6B7C]">Pending</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right text-[#5F6B7C]">
                      {sub.submitted_at || sub.created_at
                        ? new Date(sub.submitted_at || sub.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleInspect(sub.id)}
                        className="px-3 py-1.5 rounded-lg cyber-card border border-[#168BFF]/40 text-[#36C5FF] hover:bg-[#168BFF] hover:text-white transition-all font-semibold inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review & Grade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Manual Evaluation Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-4xl rounded-2xl cyber-card border border-[#1C2330] shadow-2xl overflow-hidden p-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1C2330] shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#F5F7FA]">
                    {selectedSub.problem_title || `Problem #${selectedSub.problem_id}`}
                  </h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(selectedSub.status)}`}>
                    {selectedSub.status}
                  </span>
                </div>
                <p className="text-xs text-[#9AA6B5] mt-0.5">
                  Student: <span className="text-[#F5F7FA] font-semibold">{selectedSub.student_name}</span> ({selectedSub.student_email}) • Language: <span className="font-mono text-[#36C5FF] uppercase">{selectedSub.language || "python"}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1.5 rounded-lg text-[#5F6B7C] hover:text-[#F5F7FA] hover:bg-[#161D28] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5">
              {/* Alert Feedback */}
              {feedbackMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    feedbackMsg.type === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}
                >
                  {feedbackMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* Source Code Header & Code Block */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider">
                    Submitted Source Code ({selectedSub.language || "python"})
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 rounded-lg cyber-card hover:border-[#168BFF]/40 text-xs text-[#36C5FF] font-mono flex items-center gap-1 border border-[#1C2330] transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy Code"}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#050608] border border-[#1C2330] font-mono text-xs text-[#F5F7FA] overflow-x-auto whitespace-pre-wrap max-h-80 select-text">
                  {selectedSub.source_code}
                </pre>
              </div>

              {/* Evaluation Card */}
              <div className="p-5 rounded-2xl bg-[#0B0E14] border border-[#1C2330] space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FA]">
                  <Award className="w-4 h-4 text-[#F5BD45]" />
                  <span>Manual Evaluation & Marks Assignment</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-[#9AA6B5] mb-1">
                      Marks (Max: {selectedSub.max_marks || 100})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={selectedSub.max_marks || 100}
                      step={0.5}
                      value={marksInput}
                      onChange={(e) => setMarksInput(e.target.value)}
                      placeholder={`0 - ${selectedSub.max_marks || 100}`}
                      className="cyber-input w-full px-3 py-2 rounded-xl text-sm font-bold text-[#F5F7FA]"
                    />
                  </div>

                  <div className="sm:col-span-2 text-xs text-[#5F6B7C]">
                    Enter the score for this submission. Saving as draft allows you to revise marks before publishing to the student.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9AA6B5] mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#36C5FF]" />
                    <span>Teacher Remarks & Qualitative Feedback</span>
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Provide constructive feedback on logic, time complexity, code cleanliness, or specific edge cases..."
                    className="cyber-input w-full p-3 rounded-xl text-xs text-[#F5F7FA] placeholder-[#5F6B7C] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-[#1C2330] shrink-0 flex items-center justify-between">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 rounded-xl cyber-card text-[#9AA6B5] hover:text-[#F5F7FA] text-xs font-bold transition-all"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveEvaluation(false)}
                  disabled={evaluating}
                  className="px-4 py-2 rounded-xl cyber-card border border-[#1C2330] hover:border-[#168BFF]/40 text-[#F5F7FA] text-xs font-bold transition-all disabled:opacity-50"
                >
                  Save Draft Evaluation
                </button>
                <button
                  onClick={() => handleSaveEvaluation(true)}
                  disabled={evaluating}
                  className="cyber-btn-gold px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 glow-gold disabled:opacity-50"
                >
                  {evaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Publish Evaluation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
