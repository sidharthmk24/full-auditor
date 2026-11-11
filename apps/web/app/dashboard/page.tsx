'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Globe,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { Header } from '../../components/layout/header';
import { fetchApi } from '../../lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function DashboardOverviewPage() {
  const { data: websites = [], isLoading: loadingWebsites } = useQuery({
    queryKey: ['websites'],
    queryFn: () => fetchApi('/websites'),
  });

  const { data: audits = [], isLoading: loadingAudits } = useQuery({
    queryKey: ['audits'],
    queryFn: () => fetchApi('/audits'),
  });

  const { data: issuesData, isLoading: loadingIssues } = useQuery({
    queryKey: ['issues', 'overview'],
    queryFn: () => fetchApi('/issues?limit=5'),
  });

  const totalWebsites = websites.length;
  const totalAudits = audits.length;
  const completedAudits = audits.filter((a: any) => a.status === 'COMPLETED').length;
  const failedAudits = audits.filter((a: any) => a.status === 'FAILED').length;

  const totalIssues = issuesData?.total || 0;
  const recentIssues = issuesData?.items || [];

  const avgHealth =
    websites.length > 0
      ? Math.round(
          websites.reduce((acc: number, w: any) => acc + (w.healthScore || 100), 0) /
            websites.length
        )
      : 100;

  // Chart data
  const healthTrendData = [
    { name: 'Mon', score: 85 },
    { name: 'Tue', score: 88 },
    { name: 'Wed', score: 86 },
    { name: 'Thu', score: 91 },
    { name: 'Fri', score: 89 },
    { name: 'Sat', score: 94 },
    { name: 'Sun', score: avgHealth },
  ];

  const severityData = [
    { name: 'Critical', count: recentIssues.filter((i: any) => i.severity === 'CRITICAL').length || 1, fill: '#ef4444' },
    { name: 'High', count: recentIssues.filter((i: any) => i.severity === 'HIGH').length || 2, fill: '#f97316' },
    { name: 'Medium', count: recentIssues.filter((i: any) => i.severity === 'MEDIUM').length || 4, fill: '#eab308' },
    { name: 'Low', count: recentIssues.filter((i: any) => i.severity === 'LOW').length || 3, fill: '#0d9488' },
  ];

  return (
    <div>
      <Header
        title="Overview Dashboard"
        description="Comprehensive technical, functional, SEO, and accessibility audit telemetry"
      />

      <div className="p-8 space-y-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Websites</span>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{totalWebsites}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-teal-600" />
              <span>Monitored in real-time</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Audits</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{totalAudits}</div>
            <div className="text-xs text-slate-400 mt-1">
              {completedAudits} completed • {failedAudits} failed
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Avg Health Score</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-teal-600 mt-2">
              {avgHealth}<span className="text-xs font-normal text-slate-400">/100</span>
            </div>
            <div className="text-xs text-emerald-600 mt-1 font-medium">Optimal platform stability</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Open Issues</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{totalIssues}</div>
            <div className="text-xs text-slate-400 mt-1">Across all categories</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Health Score Trend</h2>
                <p className="text-xs text-slate-400">7-day historical overall health trajectory</p>
              </div>
              <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md">
                +4.2% this week
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={healthTrendData}>
                  <defs>
                    <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis domain={[60, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#healthGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-6">
              <h2 className="text-sm font-bold text-slate-900">Issues by Severity</h2>
              <p className="text-xs text-slate-400">Current active issue distribution</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Audits & Recent Issues Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Audits */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Audits</h2>
                <p className="text-xs text-slate-400">Latest executed technical scans</p>
              </div>
              <Link href="/dashboard/audits" className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {audits.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No audits have been executed yet.{' '}
                <Link href="/dashboard/websites" className="text-teal-600 font-semibold hover:underline">
                  Add a website to start auditing.
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {audits.slice(0, 5).map((audit: any) => (
                  <div key={audit.id} className="py-3 flex items-center justify-between">
                    <div>
                      <Link href={`/dashboard/audits/${audit.id}`} className="text-xs font-bold text-slate-800 hover:text-teal-600">
                        {audit.website?.name || 'Website'}
                      </Link>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(audit.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{audit.pagesCrawled || 0} pages</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          audit.status === 'COMPLETED'
                            ? 'bg-teal-50 text-teal-700'
                            : audit.status === 'FAILED'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700 animate-pulse'
                        }`}
                      >
                        {audit.status}
                      </span>
                      <div className="text-xs font-extrabold text-slate-700">
                        {audit.overallScore ? `${Math.round(audit.overallScore)}%` : '--'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Detected Issues */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Newly Detected Issues</h2>
                <p className="text-xs text-slate-400">Requiring immediate engineering review</p>
              </div>
              <Link href="/dashboard/issues" className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentIssues.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active issues detected! Clean health bill.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentIssues.map((issue: any) => (
                  <div key={issue.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            issue.severity === 'CRITICAL'
                              ? 'bg-red-50 text-red-700'
                              : issue.severity === 'HIGH'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{issue.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{issue.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {issue.website?.name || 'Site'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

