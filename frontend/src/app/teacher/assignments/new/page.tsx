"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  BookOpen, Plus, Trash2, ArrowLeft, Loader2, AlertCircle, Sparkles
} from "lucide-react";

export default function NewAssignmentPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<any[]>([]);
  const [availableProblems, setAvailableProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    class_id: "",
    start_date: new Date().toISOString().slice(0, 16),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    max_attempts: "",
    allow_late: false,
    is_published: true,
  });

  const [selectedProblems, setSelectedProblems] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cls, probs] = await Promise.all([
          api.listTeacherClasses(),
          api.listTeacherProblems(),
        ]);
        setClasses(cls);
        setAvailableProblems(probs);
        if (cls.length > 0) {
          setFormData((prev) => ({ ...prev, class_id: cls[0].id.toString() }));
        }
      } catch (err: any) {
        setError(err.message || "Failed to load classes or problems.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddProblem = (problemId: number) => {
    const prob = availableProblems.find((p) => p.id === problemId);
    if (!prob || selectedProblems.some((p) => p.problem_id === problemId)) return;
    setSelectedProblems([
      ...selectedProblems,
      {
        problem_id: prob.id,
        title: prob.title,
        difficulty: prob.difficulty,
        points: 100,
        order_index: selectedProblems.length + 1,
      },
    ]);
  };

  const handleRemoveProblem = (problemId: number) => {
    setSelectedProblems(selectedProblems.filter((p) => p.problem_id !== problemId));
  };

  const handlePointsChange = (problemId: number, points: number) => {
    setSelectedProblems(
      selectedProblems.map((p) => (p.problem_id === problemId ? { ...p, points } : p))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.class_id) {
      setError("Please select a target class for the assignment.");
      return;
    }

    if (selectedProblems.length === 0) {
      setError("Please attach at least one problem to the assignment.");
      return;
    }

    setSaving(true);
    try {
      await api.createAssignment({
        title: formData.title,
        description: formData.description || undefined,
        class_id: parseInt(formData.class_id, 10),
        start_date: new Date(formData.start_date).toISOString(),
        due_date: new Date(formData.due_date).toISOString(),
        max_attempts: formData.max_attempts ? parseInt(formData.max_attempts, 10) : undefined,
        allow_late: formData.allow_late,
        is_published: formData.is_published,
        problems: selectedProblems.map((p, idx) => ({
          problem_id: p.problem_id,
          points: Number(p.points),
          order_index: idx + 1,
        })),
      });

      router.push("/teacher/assignments");
    } catch (err: any) {
      setError(err.message || "Failed to create assignment.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-[#9AA6B5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5BD45] mb-2" />
        <span className="ml-3 text-sm">Loading assignment builder...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/teacher/assignments"
        className="inline-flex items-center gap-1.5 text-xs text-[#9AA6B5] hover:text-[#F5BD45] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Assignments
      </Link>

      <div className="p-8 rounded-2xl cyber-card border border-[#1C2330] shadow-2xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#10151D] border border-[#F5BD45]/30 text-[#F5BD45] text-xs font-semibold mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          <span>ASSIGNMENT CREATOR</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Create Class Assignment</h1>
        <p className="text-xs text-[#9AA6B5] mt-1">
          Select target student cohort, attach Python problems, and establish assessment dates.
        </p>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Midterm Python Assessment"
                className="cyber-input w-full px-3.5 py-2.5 rounded-xl text-sm text-[#F5F7FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase">Target Class *</label>
              {classes.length === 0 ? (
                <div className="text-xs text-amber-400 py-2">
                  No classes found.{" "}
                  <Link href="/teacher/classes" className="underline font-bold text-[#F5BD45]">
                    Create a class first
                  </Link>
                </div>
              ) : (
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="cyber-input w-full px-3.5 py-2.5 rounded-xl text-sm text-[#F5F7FA]"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase">Description & Instructions</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Instructions for students regarding deadlines and evaluation criteria..."
              className="cyber-input w-full px-3.5 py-2 rounded-xl text-xs text-[#F5F7FA] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase">Start Date & Time</label>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="cyber-input w-full px-3.5 py-2 rounded-xl text-xs text-[#F5F7FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase">Due Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="cyber-input w-full px-3.5 py-2 rounded-xl text-xs text-[#F5F7FA]"
              />
            </div>
          </div>

          {/* Problem Selector & Points Assignment */}
          <div className="pt-6 border-t border-[#1C2330] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#F5F7FA]">Attached Problems ({selectedProblems.length})</h3>
                <p className="text-[11px] text-[#9AA6B5]">Pick problems from the arena and configure points per problem.</p>
              </div>

              {/* Problem Add Selector */}
              <div className="flex items-center gap-2">
                <select
                  id="prob-picker"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddProblem(parseInt(e.target.value, 10));
                      e.target.value = "";
                    }
                  }}
                  className="cyber-input px-3 py-1.5 rounded-xl text-xs text-[#F5F7FA]"
                >
                  <option value="" disabled>+ Attach Problem...</option>
                  {availableProblems
                    .filter((p) => !selectedProblems.some((sp) => sp.problem_id === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.difficulty})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {selectedProblems.map((p) => (
                <div
                  key={p.problem_id}
                  className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#1C2330] flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <h4 className="font-bold text-[#F5F7FA]">{p.title}</h4>
                    <span className="text-[10px] text-[#9AA6B5] capitalize">{p.difficulty}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#5F6B7C] text-[11px]">Points:</span>
                      <input
                        type="number"
                        min={1}
                        value={p.points}
                        onChange={(e) => handlePointsChange(p.problem_id, parseInt(e.target.value, 10) || 0)}
                        className="w-20 px-2 py-1 rounded bg-[#10151D] border border-[#1C2330] font-mono text-center text-[#F5BD45] focus:outline-none focus:border-[#F5BD45]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProblem(p.problem_id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-[#1C2330] flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#F5F7FA] cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="rounded border-[#1C2330] text-[#F5BD45] focus:ring-[#F5BD45]"
              />
              <span>Publish Assignment Immediately</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="cyber-btn-gold px-6 py-2.5 rounded-xl font-bold text-xs glow-gold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
