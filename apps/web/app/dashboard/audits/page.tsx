'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Activity, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { fetchApi } from '../../../lib/api';

export default function AuditsListPage() {
  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['audits'],
    queryFn: () => fetchApi('/audits'),
    refetchInterval: (query) => {
      const data = query.state.data as any[];
      const hasActive = data?.some((a) =>
        ['QUEUED', 'DISCOVERING', 'CRAWLING', 'TESTING', 'ANALYZING', 'REPORTING'].includes(a.status)
      );
      return hasActive ? 2000 : 10000;
    },
  });

  return (
    <div>
      <Header
        title="Audits History"
        description="Historical and running audit workflows across all tracked applications"
      />

      <div className="p-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900">All Executed Audits ({audits.length})</h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading audits...</div>
          ) : audits.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No audits have been executed yet. Go to{' '}
              <Link href="/dashboard/websites" className="text-teal-600 font-semibold underline">
                Websites
              </Link>{' '}
              and click "Run Audit".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Website</th>
                    <th className="py-3 px-4">Overall Score</th>
                    <th className="py-3 px-4">Pages Crawled</th>
                    <th className="py-3 px-4">Issues Found</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {audits.map((audit: any) => {
                    const isActive = [
                      'QUEUED',
                      'DISCOVERING',
                      'CRAWLING',
                      'TESTING',
                      'ANALYZING',
                      'REPORTING',
                    ].includes(audit.status);

                    return (
                      <tr key={audit.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              audit.status === 'COMPLETED'
                                ? 'bg-teal-50 text-teal-700'
                                : audit.status === 'FAILED'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700 animate-pulse'
                            }`}
                          >
                            {audit.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div>{audit.website?.name || 'Website'}</div>
                          <div className="text-xs text-slate-400 font-mono">{audit.website?.url}</div>
                        </td>
                        <td className="py-3 px-4">
                          {audit.overallScore ? (
                            <span className="text-sm font-black text-teal-600">
                              {Math.round(audit.overallScore)}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {isActive ? `${audit.progressPercent || 0}%` : '--'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">{audit.pagesCrawled || 0}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                          {audit.issuesFound || 0}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {new Date(audit.createdAt).toLocaleDateString()} {new Date(audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/dashboard/audits/${audit.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

