'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { fetchApi } from '../../../lib/api';

export default function IssuesPage() {
  const queryClient = useQueryClient();
  const [severity, setSeverity] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);

  const queryParams = new URLSearchParams();
  if (severity) queryParams.set('severity', severity);
  if (category) queryParams.set('category', category);
  if (status) queryParams.set('status', status);
  if (search) queryParams.set('search', search);

  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['issues', severity, category, status, search],
    queryFn: () => fetchApi(`/issues?${queryParams.toString()}`),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      fetchApi(`/issues/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      if (selectedIssue) {
        setSelectedIssue((prev: any) => ({ ...prev, status: 'RESOLVED' }));
      }
    },
  });

  const issues = issuesData?.items || [];

  return (
    <div>
      <Header
        title="Detected Issues"
        description="Deterministic issue engine grouping findings with evidence, fingerprinting, and resolution tracking"
      />

      <div className="p-8 space-y-6">
        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search issues or URLs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 w-52"
              />
            </div>

            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
            >
              <option value="">All Categories</option>
              <option value="FUNCTIONAL">Functional</option>
              <option value="BROKEN_LINK">Broken Links</option>
              <option value="SEO">SEO</option>
              <option value="ACCESSIBILITY">Accessibility</option>
              <option value="RESPONSIVE">Responsive</option>
              <option value="NETWORK">Network</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="PERSISTENT">Persistent</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Total Issues: <span className="text-slate-900 font-bold">{issuesData?.total || 0}</span>
          </div>
        </div>

        {/* Issues List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading issues...</div>
          ) : issues.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No issues matching the filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Title & Details</th>
                    <th className="py-3 px-4">Website</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issues.map((issue: any) => (
                    <tr key={issue.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            issue.severity === 'CRITICAL'
                              ? 'bg-red-50 text-red-700'
                              : issue.severity === 'HIGH'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-500">{issue.category}</td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-bold text-slate-900">{issue.title}</div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{issue.description}</p>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                        {issue.website?.name || 'Website'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            issue.status === 'RESOLVED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : issue.status === 'PERSISTENT'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {issue.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedIssue(issue)}
                          className="px-2.5 py-1 text-xs font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
                        >
                          View Details
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

      {/* Issue Details Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    selectedIssue.severity === 'CRITICAL'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {selectedIssue.severity} • {selectedIssue.category}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{selectedIssue.title}</h3>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {selectedIssue.description}
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Fingerprint Hash</span>
              <div className="text-xs font-mono text-slate-600 mt-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100 truncate">
                {selectedIssue.fingerprint}
              </div>
            </div>

            {selectedIssue.suggestedFix && (
              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase">Recommended Fix</span>
                <div className="text-xs text-slate-800 mt-0.5 bg-teal-50/50 p-3 rounded-lg border border-teal-200/50">
                  {selectedIssue.suggestedFix}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Status: <span className="font-bold text-slate-800">{selectedIssue.status}</span>
              </span>

              {selectedIssue.status !== 'RESOLVED' ? (
                <button
                  onClick={() =>
                    updateStatusMutation.mutate({ id: selectedIssue.id, newStatus: 'RESOLVED' })
                  }
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  Mark as Resolved
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-600">✓ Resolved</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

