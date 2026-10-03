"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft, Save, Loader2, Clock, Award, FileText, CheckCircle2 } from "lucide-react";

export default function NewTeacherTestPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "• Read each question carefully before answering.\n• Your progress is automatically saved as draft.\n• Complete and submit the test before the countdown timer expires.",
    duration_minutes: 60,
    total_marks: 100,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg("Test title is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await api.createTeacherTest(formData);
      router.push(`/teacher/tests/${created.id}/edit`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create online test.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/teacher/tests" className="inline-flex items-center gap-1.5 text-xs text-[#9AA6B5] hover:text-[#F5BD45] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Tests
      </Link>

      <div className="p-8 rounded-2xl cyber-card border border-[#1C2330] shadow-xl space-y-6">
        <div className="pb-4 border-b border-[#1C2330]">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#10151D] border border-[#F5BD45]/30 text-[#F5BD45] text-xs font-semibold mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>TEST COMPILER</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#F5F7FA]">Create Online Assessment</h1>
          <p className="text-xs text-[#9AA6B5] mt-1">
            Configure test parameters. You will be able to construct questions (MCQs, theory, and coding problems) in the next step.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div>
            <label className="block font-semibold text-[#CBD5E1] mb-1.5">Test Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Midterm Python & Data Structures Assessment"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="cyber-input w-full px-4 py-2.5 rounded-xl text-xs text-[#F5F7FA]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#CBD5E1] mb-1.5">Description & Topics Covered</label>
            <textarea
              rows={3}
              placeholder="Provide a brief summary of the syllabus or topics covered in this exam..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="cyber-input w-full p-4 rounded-xl text-xs text-[#F5F7FA] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#CBD5E1] mb-1.5">Duration (Minutes) *</label>
              <input
                type="number"
                min={5}
                max={480}
                required
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                className="cyber-input w-full px-4 py-2.5 rounded-xl text-xs text-[#F5F7FA]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#CBD5E1] mb-1.5">Total Marks *</label>
              <input
                type="number"
                min={1}
                max={1000}
                required
                value={formData.total_marks}
                onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })}
                className="cyber-input w-full px-4 py-2.5 rounded-xl text-xs text-[#F5F7FA]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#CBD5E1] mb-1.5">Candidate Instructions & Guidelines</label>
            <textarea
              rows={4}
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="cyber-input w-full p-4 rounded-xl text-xs text-[#F5F7FA] resize-none"
            />
          </div>

          <div className="pt-4 border-t border-[#1C2330] flex items-center justify-end gap-3">
            <Link
              href="/teacher/tests"
              className="px-4 py-2 rounded-xl cyber-card text-[#9AA6B5] hover:text-[#F5F7FA] font-bold text-xs transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="cyber-btn-gold px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 glow-gold transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Create Test & Add Questions</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
