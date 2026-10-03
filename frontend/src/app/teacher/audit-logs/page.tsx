"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  FileText, Search, Filter, ShieldCheck, Clock, Loader2, AlertCircle
} from "lucide-react";

export default function TeacherAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.listAuditLogs({
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
      });
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="pb-6 border-b border-[#1C2330]">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#10151D] border border-[#F5BD45]/30 text-[#F5BD45] text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>IMMUTABLE SECURITY LEDGER</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#F5F7FA]">Platform Audit Trail</h1>
        <p className="text-xs text-[#9AA6B5] mt-1">
          Cryptographically recorded security logs, verification reviews, and administrative changes.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-64">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="cyber-input w-full px-3.5 py-2.5 rounded-xl text-xs text-[#F5F7FA]"
          >
            <option value="">All Action Types</option>
            <option value="VERIFICATION_APPROVE">VERIFICATION_APPROVE</option>
            <option value="VERIFICATION_REJECT">VERIFICATION_REJECT</option>
            <option value="PROBLEM_CREATE">PROBLEM_CREATE</option>
            <option value="PROBLEM_PUBLISH_TOGGLE">PROBLEM_PUBLISH_TOGGLE</option>
            <option value="CLASS_CREATE">CLASS_CREATE</option>
            <option value="ASSIGNMENT_CREATE">ASSIGNMENT_CREATE</option>
            <option value="PERMISSIONS_UPDATE">PERMISSIONS_UPDATE</option>
            <option value="USER_SUSPEND">USER_SUSPEND</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl cyber-card border border-[#1C2330] overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 flex items-center justify-center text-[#9AA6B5]">
            <Loader2 className="w-6 h-6 animate-spin text-[#F5BD45] mr-2" />
            <span className="text-xs">Loading audit trail...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-[#9AA6B5]">
            <FileText className="w-10 h-10 mx-auto text-[#5F6B7C] mb-2" />
            <h3 className="text-sm font-bold text-[#F5F7FA]">No Audit Records Found</h3>
            <p className="text-xs text-[#5F6B7C] mt-1">Actions performed on the platform will be logged here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050608] text-[#9AA6B5] uppercase tracking-wider border-b border-[#1C2330]">
                <tr>
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Action</th>
                  <th className="py-3 px-6">Entity</th>
                  <th className="py-3 px-6">Author</th>
                  <th className="py-3 px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2330]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#161D28]/40 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-[#5F6B7C] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-mono text-xs font-bold text-[#F5BD45] px-2 py-0.5 rounded bg-[#0B0E14] border border-[#F5BD45]/30">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[#9AA6B5]">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ""}
                    </td>
                    <td className="py-3.5 px-6 text-[#F5F7FA] font-semibold">
                      {log.user_email || `User #${log.user_id}`}
                    </td>
                    <td className="py-3.5 px-6 text-[#9AA6B5] max-w-xs truncate">
                      {log.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
