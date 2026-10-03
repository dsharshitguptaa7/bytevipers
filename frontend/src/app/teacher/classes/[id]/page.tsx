"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  School, Users, UserPlus, Trash2, ArrowLeft, Loader2,
  AlertCircle, CheckCircle2, Key, Copy
} from "lucide-react";

export default function ClassRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const classId = parseInt(resolvedParams.id, 10);

  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [studentEmail, setStudentEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadClass = async () => {
    setLoading(true);
    try {
      const data = await api.getTeacherClass(classId);
      setClassData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load class roster.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClass();
  }, [classId]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail.trim()) return;
    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      await api.addStudentToClass(classId, studentEmail.trim());
      setSuccess(`Student ${studentEmail} added to class.`);
      setStudentEmail("");
      await loadClass();
    } catch (err: any) {
      setError(err.message || "Failed to add student to class.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStudent = async (userId: number, studentName: string) => {
    if (window.confirm(`Remove ${studentName} from this class?`)) {
      try {
        await api.removeStudentFromClass(classId, userId);
        await loadClass();
      } catch (err: any) {
        setError(err.message || "Failed to remove student.");
      }
    }
  };

  const copyCode = () => {
    if (classData?.code) {
      navigator.clipboard.writeText(classData.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-[#9AA6B5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5BD45] mb-2" />
        <span className="ml-3 text-sm">Loading class roster...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/teacher/classes"
        className="inline-flex items-center gap-1.5 text-xs text-[#9AA6B5] hover:text-[#F5BD45] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Classes
      </Link>

      {/* Class Meta Card */}
      <div className="p-8 rounded-2xl cyber-card border border-[#1C2330] shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1C2330]">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#10151D] border border-[#F5BD45]/30 text-[#F5BD45] text-xs font-semibold mb-2">
              <School className="w-3.5 h-3.5" />
              <span>COHORT ROSTER</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#F5F7FA]">{classData?.name}</h1>
            <p className="text-xs text-[#9AA6B5] mt-1">{classData?.description || "No description provided."}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copyCode}
              className="px-4 py-2 rounded-xl cyber-card border border-[#F5BD45]/40 text-xs font-mono font-bold text-[#F5BD45] hover:bg-[#F5BD45]/10 transition-colors flex items-center gap-2"
            >
              <Key className="w-4 h-4 text-[#F5BD45]" />
              <span>Enrollment Key: {classData?.code}</span>
              {copiedCode && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Add Student Form */}
        <form onSubmit={handleAddStudent} className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            placeholder="Add enrolled student by email (e.g. student@bytevipers.edu)..."
            className="cyber-input flex-1 px-3.5 py-2.5 rounded-xl text-xs text-[#F5F7FA]"
          />
          <button
            type="submit"
            disabled={adding}
            className="cyber-btn-gold px-5 py-2.5 rounded-xl font-bold text-xs glow-gold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Add Student
          </button>
        </form>

        {/* Roster Table */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-[#9AA6B5] uppercase tracking-wider mb-4">
            Enrolled Students ({classData?.members?.length || 0})
          </h3>

          {classData?.members?.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#0B0E14] border border-[#1C2330] text-center text-[#5F6B7C] text-xs">
              No students enrolled in this class yet. Share the enrollment key above with students.
            </div>
          ) : (
            <div className="rounded-xl bg-[#0B0E14] border border-[#1C2330] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050608] text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Enrolled Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C2330]">
                  {classData.members.map((m: any) => (
                    <tr key={m.id} className="hover:bg-[#161D28]/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#F5F7FA]">{m.student_name}</td>
                      <td className="py-3 px-4 text-[#9AA6B5]">{m.student_email}</td>
                      <td className="py-3 px-4 text-[#5F6B7C]">{new Date(m.joined_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRemoveStudent(m.user_id, m.student_name)}
                          className="text-red-400 hover:text-red-300 p-1 transition-colors"
                          title="Remove from class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
