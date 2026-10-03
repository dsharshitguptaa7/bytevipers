"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Code2, Plus, Trash2, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Terminal
} from "lucide-react";

export default function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const problemId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    difficulty: "Easy",
    description: "",
    input_description: "",
    output_description: "",
    constraints: "",
    starter_code: "",
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    is_published: false,
    tagsInput: "",
  });

  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getTeacherProblem(problemId);
        setFormData({
          title: data.title,
          slug: data.slug,
          difficulty: data.difficulty,
          description: data.description,
          input_description: data.input_description || "",
          output_description: data.output_description || "",
          constraints: data.constraints || "",
          starter_code: data.starter_code,
          time_limit_ms: data.time_limit_ms,
          memory_limit_mb: data.memory_limit_mb,
          is_published: data.is_published,
          tagsInput: data.tags?.map((t: any) => t.name).join(", ") || "",
        });
        setTestCases(data.test_cases || []);
      } catch (err: any) {
        setError(err.message || "Failed to load problem details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [problemId]);

  const addTestCase = () => {
    setTestCases([
      ...testCases,
      {
        input_data: "",
        expected_output: "",
        is_sample: false,
        sample_explanation: "",
        order_index: testCases.length + 1,
      },
    ]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: string, value: any) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (testCases.length === 0) {
      setError("At least one test case is required to evaluate student solutions.");
      return;
    }

    setSaving(true);
    try {
      const tags = formData.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await api.updateProblem(problemId, {
        title: formData.title,
        slug: formData.slug || undefined,
        difficulty: formData.difficulty,
        description: formData.description,
        input_description: formData.input_description || undefined,
        output_description: formData.output_description || undefined,
        constraints: formData.constraints || undefined,
        starter_code: formData.starter_code,
        time_limit_ms: Number(formData.time_limit_ms),
        memory_limit_mb: Number(formData.memory_limit_mb),
        is_published: formData.is_published,
        tags,
        test_cases: testCases,
      });

      router.push("/teacher/problems");
    } catch (err: any) {
      setError(err.message || "Failed to update problem.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-[#9AA6B5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5BD45] mb-2" />
        <span className="ml-3 text-sm">Loading problem details...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/teacher/problems"
        className="inline-flex items-center gap-1.5 text-xs text-[#9AA6B5] hover:text-[#F5BD45] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Problem Management
      </Link>

      <div className="p-8 rounded-2xl cyber-card border border-[#1C2330] shadow-2xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#10151D] border border-[#F5BD45]/30 text-[#F5BD45] text-xs font-semibold mb-2">
          <Terminal className="w-3.5 h-3.5" />
          <span>ARENA CHALLENGE EDITOR</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Edit Python Challenge</h1>
        <p className="text-xs text-[#9AA6B5] mt-1">
          Update problem statements, execution limits, and the evaluation suite.
        </p>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="cyber-input w-full px-3.5 py-2.5 rounded-xl text-sm text-[#F5F7FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase">Difficulty *</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="cyber-input w-full px-3.5 py-2.5 rounded-xl text-sm text-[#F5F7FA]"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase">Problem Statement *</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="cyber-input w-full px-3.5 py-2.5 rounded-xl text-sm text-[#F5F7FA] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase">Constraints</label>
              <input
                type="text"
                value={formData.constraints}
                onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                className="cyber-input w-full px-3.5 py-2.5 rounded-xl text-xs font-mono text-[#F5F7FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase">Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tagsInput}
                onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
                className="cyber-input w-full px-3.5 py-2.5 rounded-xl text-xs text-[#F5F7FA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9AA6B5] mb-1.5 uppercase">Starter Python Code *</label>
            <textarea
              required
              rows={6}
              value={formData.starter_code}
              onChange={(e) => setFormData({ ...formData, starter_code: e.target.value })}
              className="cyber-input w-full p-3 rounded-xl font-mono text-xs text-[#F5F7FA] resize-none"
            />
          </div>

          {/* Test Cases Builder */}
          <div className="pt-6 border-t border-[#1C2330] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F5F7FA]">Test Cases Evaluation Suite ({testCases.length})</h3>
              <button
                type="button"
                onClick={addTestCase}
                className="px-3 py-1.5 rounded-xl cyber-card border border-[#168BFF]/40 text-[#36C5FF] font-bold text-xs hover:bg-[#168BFF] hover:text-white transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Case
              </button>
            </div>

            <div className="space-y-3">
              {testCases.map((tc, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0B0E14] border border-[#1C2330] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F5BD45] font-mono">Case #{idx + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-[#F5F7FA] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.is_sample}
                          onChange={(e) => updateTestCase(idx, "is_sample", e.target.checked)}
                          className="rounded border-[#1C2330] text-[#F5BD45] focus:ring-0"
                        />
                        <span>Public Sample Case</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeTestCase(idx)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-[#5F6B7C] uppercase block mb-1">Standard Input (stdin)</span>
                      <textarea
                        required
                        rows={2}
                        value={tc.input_data}
                        onChange={(e) => updateTestCase(idx, "input_data", e.target.value)}
                        className="cyber-input w-full p-2 rounded-lg font-mono text-xs text-[#F5F7FA] resize-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#5F6B7C] uppercase block mb-1">Expected Output (stdout)</span>
                      <textarea
                        required
                        rows={2}
                        value={tc.expected_output}
                        onChange={(e) => updateTestCase(idx, "expected_output", e.target.value)}
                        className="cyber-input w-full p-2 rounded-lg font-mono text-xs text-emerald-400 resize-none"
                      />
                    </div>
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
              <span>Published to Arena</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="cyber-btn-gold px-6 py-2.5 rounded-xl font-bold text-xs glow-gold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
