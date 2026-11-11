'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, ExternalLink, Calendar } from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { fetchApi } from '../../../lib/api';

export default function ReportsPage() {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => fetchApi('/reports'),
  });

  return (
    <div>
      <Header
        title="Audit Reports"
        description="Standalone executive and technical audit reports ready for distribution or printing"
      />

      <div className="p-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900">Generated Reports ({reports.length})</h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No reports generated yet. Execute an audit on a website to generate standalone reports.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Website</th>
                    <th className="py-3 px-4">Overall Score</th>
                    <th className="py-3 px-4">Issues Found</th>
                    <th className="py-3 px-4">Generated Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((report: any) => (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{report.website?.name || 'Website'}</div>
                        <div className="text-xs text-slate-400 font-mono">{report.website?.url}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-black text-teal-600">
                          {Math.round(report.overallScore || 0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                        {report.issuesFound || 0}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <a
                          href={`http://localhost:4000/api/v1/reports/${report.id}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View</span>
                        </a>

                        <a
                          href={`http://localhost:4000/api/v1/reports/${report.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
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

