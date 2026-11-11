'use client';

import React, { useState } from 'react';
import { User, Shield, Key, Bell, Database, Server, CheckCircle2 } from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { getCurrentUser } from '../../../lib/api';

export default function SettingsPage() {
  const user = getCurrentUser();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);

  return (
    <div>
      <Header
        title="Settings & Integrations"
        description="Manage workspace organization, notification preferences, and external service statuses"
      />

      <div className="p-8 max-w-4xl space-y-6">
        {/* User Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">User Profile</h2>
              <p className="text-xs text-slate-500">Your account identity and role</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
              <div className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {user?.name || 'Administrator'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
              <div className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {user?.email || 'admin@auditor.local'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Workspace Role</label>
              <div className="text-xs font-bold text-teal-700 bg-teal-50 p-2.5 rounded-lg border border-teal-200">
                {user?.role || 'ADMIN'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Organization ID</label>
              <div className="text-xs font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 truncate">
                {user?.organizationId || 'org-master-default'}
              </div>
            </div>
          </div>
        </div>

        {/* Integration Statuses Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Infrastructure & External Services</h2>
              <p className="text-xs text-slate-500">Live operational status of configured platform dependencies</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="py-3 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-800">PostgreSQL 18 Database</div>
                <div className="text-[11px] text-slate-400">Prisma client connection & relational store</div>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected</span>
              </span>
            </div>

            <div className="py-3 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-800">Redis & BullMQ Engine</div>
                <div className="text-[11px] text-slate-400">Queue broker for background workers & concurrency control</div>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active (port 6379)</span>
              </span>
            </div>

            <div className="py-3 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-800">Playwright Chromium Browser</div>
                <div className="text-[11px] text-slate-400">Headless browser pool for interactive element & viewport testing</div>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Installed (v1.50)</span>
              </span>
            </div>

            <div className="py-3 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-800">OpenAI API Engine</div>
                <div className="text-[11px] text-slate-400">Structured JSON executive synthesis & impact analysis</div>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                Configured / Fallback Active
              </span>
            </div>

            <div className="py-3 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-800">Local Artifact Storage</div>
                <div className="text-[11px] text-slate-400">Adapter for generated screenshots and HTML reports</div>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready (./uploads)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Notifications Preference Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Notification Alerts</h2>
              <p className="text-xs text-slate-500">Configure email and audit completion alerts</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <span className="text-xs text-slate-700">Email me when an automated audit finishes</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={criticalOnly}
                onChange={(e) => setCriticalOnly(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <span className="text-xs text-slate-700">Only notify on CRITICAL severity issues</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

