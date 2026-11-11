'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Smartphone,
  Monitor,
  Tablet,
  FileText,
  Download,
  Terminal,
  MousePointerClick,
  Layers,
  Radio,
  Cpu,
  RefreshCw,
  Eye,
  Maximize2,
  X,
  ShieldAlert,
} from 'lucide-react';
import { Header } from '../../../../components/layout/header';
import { fetchApi } from '../../../../lib/api';

export default function AuditDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [activeTab, setActiveTab] = useState<
    'responsive' | 'summary' | 'functional' | 'links' | 'seo' | 'accessibility' | 'network'
  >('responsive');
  const [selectedDevice, setSelectedDevice] = useState<'Desktop' | 'Tablet' | 'Mobile'>('Desktop');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; selector?: string } | null>(null);

  const [liveStreamFrame, setLiveStreamFrame] = useState<string | null>(null);
  const [liveStreamAction, setLiveStreamAction] = useState<string | null>(null);

  const { data: audit, isLoading, error } = useQuery({
    queryKey: ['audit', id],
    queryFn: () => fetchApi(`/audits/${id}`),
    refetchInterval: (query) => {
      const data = query.state.data as any;
      const isActive = [
        'QUEUED',
        'DISCOVERING',
        'CRAWLING',
        'TESTING',
        'ANALYZING',
        'REPORTING',
      ].includes(data?.status);
      return isActive ? 1200 : false;
    },
  });

  const isRunning = [
    'QUEUED',
    'DISCOVERING',
    'CRAWLING',
    'TESTING',
    'ANALYZING',
    'REPORTING',
  ].includes(audit?.status);

  // Poll and subscribe to live browser frame stream while audit is actively running
  useEffect(() => {
    if (!isRunning) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`http://localhost:4000/api/v1/audits/${id}/stream`);
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.liveFrame) {
            setLiveStreamFrame(payload.liveFrame);
          }
          if (payload.liveAction) {
            setLiveStreamAction(payload.liveAction);
          }
        } catch {}
      };
    } catch {}

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/v1/audits/${id}/live-frame`);
        if (res.ok) {
          const data = await res.json();
          if (data.liveFrame) setLiveStreamFrame(data.liveFrame);
          if (data.liveAction) setLiveStreamAction(data.liveAction);
        }
      } catch {}
    }, 900);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [id, isRunning]);

  if (isLoading) {
    return (
      <div>
        <Header title="Audit Details" />
        <div className="p-12 text-center text-slate-400">Loading audit telemetry...</div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div>
        <Header title="Audit Details" />
        <div className="p-12 text-center text-red-500">Failed to load audit: {(error as any)?.message}</div>
      </div>
    );
  }

  const getAssetUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
    return `http://localhost:4000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const uiBreakArtifacts = (audit.artifacts || []).filter((a: any) => a.type === 'ui_break');
  const visualFrames = (audit.artifacts || []).filter((a: any) => a.type === 'visual_scan');
  const responsiveShots = audit.responsiveResults || [];

  // Desktop verified image
  const desktopShot =
    responsiveShots.find((r: any) => r.deviceLabel === 'Desktop')?.screenshotUrl ||
    (visualFrames.length > 0 ? visualFrames[0].fileName : null);

  const activeDeviceSnapshot =
    selectedDevice === 'Desktop'
      ? desktopShot
      : responsiveShots.find((r: any) => r.deviceLabel === selectedDevice)?.screenshotUrl;

  return (
    <div>
      <Header
        title={`Audit: ${audit.website?.name || 'Website'}`}
        description={`Audit ID: ${audit.id} • Initiated ${new Date(audit.createdAt).toLocaleString()}`}
      />

      <div className="p-8 space-y-6">
        {/* Top Navigation & Actions */}
        <div className="flex justify-between items-center">
          <Link
            href="/dashboard/audits"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to all audits</span>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href={`http://localhost:4000/api/v1/reports/${audit.id}/view`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Full Report</span>
            </a>
            <a
              href={`http://localhost:4000/api/v1/reports/${audit.id}/download`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download HTML</span>
            </a>
          </div>
        </div>

        {/* Live Status Header Banner */}
        <div
          className={`rounded-2xl p-6 border shadow-sm transition-all ${
            isRunning
              ? 'bg-slate-900 border-teal-500/40 text-white ring-1 ring-teal-500/30'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isRunning
                    ? 'bg-teal-500/20 text-teal-400'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      isRunning
                        ? 'bg-red-500 animate-ping'
                        : audit.status === 'COMPLETED'
                        ? 'bg-emerald-500'
                        : 'bg-red-500'
                    }`}
                  ></span>
                  <span
                    className={`text-xs font-mono font-bold uppercase tracking-wider ${
                      isRunning ? 'text-red-400 font-extrabold flex items-center gap-1.5' : 'text-slate-500'
                    }`}
                  >
                    {isRunning ? '🔴 LIVE AUDIT STREAMING' : `Audit ${audit.status}`}
                  </span>
                </div>
                <h2 className="text-sm font-bold mt-0.5">
                  {audit.currentStep || 'Initializing auditing pipeline...'}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <div
                className={`text-2xl font-black ${
                  isRunning ? 'text-teal-400' : 'text-slate-800'
                }`}
              >
                {audit.progressPercent || (isRunning ? 5 : 100)}%
              </div>
              <div
                className={`text-[11px] font-mono ${
                  isRunning ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Target: {audit.website?.url}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200/40 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isRunning
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-400'
                  : 'bg-teal-600'
              }`}
              style={{ width: `${audit.progressPercent || (isRunning ? 5 : 100)}%` }}
            ></div>
          </div>

          {/* Live Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100/10">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Pages Crawled</div>
              <div className="text-lg font-bold mt-0.5">{audit.pagesCrawled || 0}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Links Inspected</div>
              <div className="text-lg font-bold mt-0.5">{audit.linksChecked || 0}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Controls Tested</div>
              <div className="text-lg font-bold mt-0.5">{audit.interactionsTested || 0}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">UI Defects / Issues</div>
              <div className={`text-lg font-bold mt-0.5 ${audit.issuesFound > 0 ? 'text-red-400 font-extrabold' : ''}`}>
                {audit.issuesFound || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6 overflow-x-auto">
            {[
              {
                id: 'responsive',
                label: `Live Viewport & UI Defects (${uiBreakArtifacts.length > 0 ? `${uiBreakArtifacts.length} defects` : '1440px'})`,
                icon: Monitor,
              },
              { id: 'summary', label: 'AI Summary & Plan', icon: Sparkles },
              { id: 'functional', label: `Functional & Controls (${audit.interactionTests?.length || 0})`, icon: MousePointerClick },
              { id: 'links', label: `Links Checked (${audit.linkChecks?.length || 0})`, icon: ExternalLink },
              { id: 'seo', label: 'SEO Findings', icon: FileText },
              { id: 'accessibility', label: 'Accessibility', icon: Layers },
              { id: 'network', label: 'Network & Console', icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 flex items-center gap-2 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                    isActive
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab 1: Live Viewport & UI Defects */}
        {activeTab === 'responsive' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-teal-600" />
                    <span>Live Browser Inspection Session</span>
                    {isRunning && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 animate-pulse border border-red-200">
                        🔴 LIVE
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time Playwright browser viewport auditing the website at standard 1440px desktop width, scrolling section-by-section and detecting layout anomalies.
                  </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {(['Desktop', 'Tablet', 'Mobile'] as const).map((device) => (
                    <button
                      key={device}
                      onClick={() => setSelectedDevice(device)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                        selectedDevice === device
                          ? 'bg-white text-teal-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {device} {device === 'Desktop' ? '(1440px)' : device === 'Tablet' ? '(768px)' : '(390px)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Viewport Frame Viewer */}
              <div className="flex justify-center bg-slate-900/5 p-6 rounded-2xl border border-slate-200 overflow-x-auto">
                <div
                  className={`bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden transition-all duration-300 ${
                    selectedDevice === 'Mobile'
                      ? 'w-[390px]'
                      : selectedDevice === 'Tablet'
                      ? 'w-[768px]'
                      : 'w-full max-w-[1040px]'
                  }`}
                >
                  {/* Browser Bar */}
                  <div className="h-9 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600 bg-white px-3 py-0.5 rounded border border-slate-200 mx-auto truncate max-w-sm">
                      {audit.website?.url}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                      {selectedDevice === 'Desktop'
                        ? '1440 × 900'
                        : selectedDevice === 'Tablet'
                        ? '768 × 1024'
                        : '390 × 844'}
                    </span>
                  </div>

                  {/* Live Action Ticker Banner (while running) */}
                  {isRunning && (
                    <div className="bg-slate-900 text-teal-300 px-4 py-2 text-xs font-mono flex items-center justify-between border-b border-slate-800">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                        <span className="truncate">
                          {liveStreamAction || audit.currentStep || 'AI Inspector scanning viewport...'}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold ml-2 whitespace-nowrap">
                        Desktop 1440px
                      </span>
                    </div>
                  )}

                  {/* Frame Image Container */}
                  <div className="relative bg-slate-950 min-h-[480px] flex items-center justify-center overflow-hidden group">
                    {/* If running on Desktop, display the live stream frame! */}
                    {isRunning && selectedDevice === 'Desktop' && liveStreamFrame ? (
                      <div className="relative w-full">
                        <img
                          src={liveStreamFrame}
                          alt="Live AI Auditor Viewport Feed"
                          className="w-full h-auto object-contain max-h-[640px]"
                        />
                        <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                          <span>LIVE FEED</span>
                        </div>
                      </div>
                    ) : activeDeviceSnapshot ? (
                      /* If completed or viewing snapshot */
                      <div className="relative w-full">
                        <img
                          src={getAssetUrl(`/uploads/artifacts/${audit.id}/${activeDeviceSnapshot}`)}
                          alt={`${selectedDevice} viewport snapshot`}
                          className="w-full h-auto object-contain max-h-[640px]"
                        />
                        <button
                          onClick={() =>
                            setPreviewImage({
                              url: getAssetUrl(`/uploads/artifacts/${audit.id}/${activeDeviceSnapshot}`),
                              title: `${selectedDevice} Viewport Inspection (${
                                selectedDevice === 'Desktop' ? '1440px' : selectedDevice === 'Tablet' ? '768px' : '390px'
                              })`,
                            })
                          }
                          className="absolute bottom-4 right-4 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur shadow-sm transition"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Enlarge Screenshot</span>
                        </button>
                      </div>
                    ) : isRunning ? (
                      <div className="p-12 text-center text-teal-400 space-y-3">
                        <Activity className="w-8 h-8 mx-auto animate-spin" />
                        <div className="text-sm font-bold">Connecting to live browser session...</div>
                        <div className="text-xs text-slate-400">
                          Navigating to {audit.website?.url} on 1440px Desktop viewport.
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 text-center text-slate-500">
                        No viewport snapshot recorded for this device.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Viewport Metric Badges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {audit.responsiveResults?.map((device: any) => (
                  <div key={device.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-900">{device.deviceLabel}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          device.hasOverflowX ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {device.hasOverflowX ? 'Overflow Defect' : 'Fits Viewport'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {device.viewportWidth} × {device.viewportHeight}px
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual UI Breakages & Layout Defect Gallery */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span>Visual UI Breakages & Layout Defect Gallery</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    High-resolution annotated screenshots capturing elements with horizontal overflow, broken media, or clipped text.
                  </p>
                </div>

                <span className="text-xs font-bold px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {uiBreakArtifacts.length} Captured Defect(s)
                </span>
              </div>

              {uiBreakArtifacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {uiBreakArtifacts.map((artifact: any, idx: number) => {
                    const matchedOccurrence = (audit.issueOccurrences || []).find((occ: any) =>
                      occ.evidenceJson?.screenshotUrl?.includes(artifact.fileName)
                    );
                    const defectTitle = matchedOccurrence?.issue?.title || `Visual Layout Defect #${idx + 1}`;
                    const defectDesc =
                      matchedOccurrence?.issue?.description ||
                      'Element extends beyond standard container constraints or failed rendering.';
                    const suggestedFix = matchedOccurrence?.issue?.suggestedFix || 'Check container CSS boundaries.';
                    const selector = matchedOccurrence?.elementSelector || matchedOccurrence?.evidenceJson?.selector;

                    return (
                      <div
                        key={artifact.id}
                        className="bg-white border-2 border-red-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="bg-red-50 px-4 py-2.5 border-b border-red-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-red-700 font-mono">
                              {selector || 'Offending Element'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white">
                              UI BREAK
                            </span>
                          </div>

                          {/* Screenshot Container */}
                          <div className="relative bg-slate-950 p-2 flex justify-center border-b border-slate-100 group">
                            <img
                              src={getAssetUrl(artifact.publicUrl)}
                              alt="Captured UI defect"
                              className="max-h-60 object-contain rounded border border-slate-800"
                            />
                            <button
                              onClick={() =>
                                setPreviewImage({
                                  url: getAssetUrl(artifact.publicUrl),
                                  title: defectTitle,
                                  selector,
                                })
                              }
                              className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5"
                            >
                              <Maximize2 className="w-4 h-4" />
                              <span>Enlarge Screenshot</span>
                            </button>
                          </div>

                          <div className="p-4 space-y-1.5">
                            <h4 className="text-xs font-bold text-slate-900">{defectTitle}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">{defectDesc}</p>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                          <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                            Recommended CSS Remediation
                          </div>
                          <div className="text-xs font-mono text-slate-700 mt-1 bg-white p-2 rounded border border-slate-200">
                            {suggestedFix}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <div className="font-bold">No Visual UI Breakages Detected</div>
                    <div className="text-emerald-700 text-[11px] mt-0.5">
                      Visual inspection completed across 1440px Desktop, Tablet, and Mobile viewports with zero horizontal overflow or broken media elements.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: AI Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {uiBreakArtifacts.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-600 text-white rounded-xl shadow-sm">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-950">
                      {uiBreakArtifacts.length} Visual UI Defect(s) Detected
                    </h4>
                    <p className="text-xs text-red-700 mt-0.5">
                      The AI inspector detected layout overflow or broken elements on Desktop (1440px) or Mobile.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('responsive')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap"
                >
                  Inspect UI Defects
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-teal-600">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900">Executive Synthesis</h3>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {audit.aiAnalysis?.executiveSummary ||
                  'Automated audit summary will populate upon scan completion.'}
              </p>

              {audit.aiAnalysis?.keyRecommendations && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {(audit.aiAnalysis.keyRecommendations as any).map((rec: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-start gap-2"
                    >
                      <span className="font-bold text-amber-600">•</span>
                      <span>{typeof rec === 'string' ? rec : (rec as any).recommendation}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {audit.aiAnalysis?.actionPlan && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Prioritized Action Plan</h3>
                <div className="space-y-3">
                  {(audit.aiAnalysis.actionPlan as any).map((plan: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex gap-4 items-start"
                    >
                      <div className="w-7 h-7 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                        {plan.step || idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{plan.action}</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          <span className="font-semibold text-teal-700">Expected Impact:</span>{' '}
                          {plan.expectedImpact}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Functional */}
        {activeTab === 'functional' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">
                  Interactive Element Tests ({audit.interactionTests?.length || 0})
                </h3>
                <span className="text-xs text-slate-500">Buttons, links, modal triggers</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Control Label</th>
                      <th className="py-3 px-4">DOM Selector</th>
                      <th className="py-3 px-4">Observable Outcome</th>
                      <th className="py-3 px-4">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {audit.interactionTests?.map((test: any) => (
                      <tr key={test.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              test.isWorking ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {test.isWorking ? 'WORKING' : 'FAILED'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-bold text-slate-800">{test.elementLabel}</td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-500 truncate max-w-xs">
                          {test.elementSelector}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                          {test.outcome.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">{test.executionTimeMs || 0}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Links */}
        {activeTab === 'links' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Checked Links ({audit.linkChecks?.length || 0})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Target Destination</th>
                    <th className="py-3 px-4">Anchor Text</th>
                    <th className="py-3 px-4">Scope</th>
                    <th className="py-3 px-4">Source Page</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {audit.linkChecks?.map((link: any) => (
                    <tr key={link.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            link.isBroken ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          HTTP {link.statusCode || 'ERR'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-800 max-w-md truncate">
                        {link.targetUrl}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{link.anchorText || '--'}</td>
                      <td className="py-3 px-4 text-[11px] text-slate-400 uppercase">
                        {link.isExternal ? 'External' : 'Internal'}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-500 max-w-xs truncate">
                        {link.sourceUrl}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: SEO */}
        {activeTab === 'seo' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Search Engine Optimization Findings</h3>
            <div className="divide-y divide-slate-100">
              {audit.seoResults?.map((res: any) => (
                <div key={res.id} className="py-3 space-y-1">
                  <div className="text-xs font-bold text-slate-800">{res.title || 'Missing Page Title'}</div>
                  <div className="text-xs text-slate-500 font-mono">{res.pageUrl}</div>
                  <div className="text-[11px] text-slate-400">
                    Title length: {res.titleLength || 0} chars • H1 count: {res.h1Count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Accessibility */}
        {activeTab === 'accessibility' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Automated Accessibility Indicators (WCAG)</h3>
            <div className="divide-y divide-slate-100">
              {audit.formTests?.map((form: any) => (
                <div key={form.id} className="py-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 font-mono">{form.formSelector}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        form.hasValidLabels ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {form.hasValidLabels ? 'Valid Labels' : 'Missing Labels'}
                    </span>
                  </div>
                  {form.issues?.map((iss: string, i: number) => (
                    <div key={i} className="text-xs text-amber-700">
                      • {iss}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 7: Network & Console */}
        {activeTab === 'network' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Browser Console Logs ({audit.consoleEvents?.length || 0})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {audit.consoleEvents?.map((ev: any) => (
                  <div
                    key={ev.id}
                    className={`p-2.5 rounded-lg text-xs font-mono ${
                      ev.level === 'error' ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="font-bold uppercase text-[10px] mr-2">[{ev.level}]</span>
                    {ev.message}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Network Requests ({audit.networkEvents?.length || 0})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {audit.networkEvents?.map((net: any) => (
                  <div key={net.id} className="p-2.5 rounded-lg text-xs bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800 font-mono">{net.method}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          net.statusCode >= 400 ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {net.statusCode || 'FAIL'}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 truncate">{net.requestUrl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Screenshot Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">{previewImage.title}</h3>
                {previewImage.selector && (
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{previewImage.selector}</div>
                )}
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 overflow-auto flex items-center justify-center min-h-[400px]">
              <img
                src={previewImage.url}
                alt="Enlarged visual inspection screenshot"
                className="max-h-[75vh] w-auto object-contain rounded border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
