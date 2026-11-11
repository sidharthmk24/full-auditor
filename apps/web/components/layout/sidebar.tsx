'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  Activity,
  AlertTriangle,
  FileText,
  Calendar,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { removeAuthToken, getCurrentUser } from '../../lib/api';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Websites', href: '/dashboard/websites', icon: Globe },
  { name: 'Audits', href: '/dashboard/audits', icon: Activity },
  { name: 'Issues', href: '/dashboard/issues', icon: AlertTriangle },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Schedules', href: '/dashboard/schedules', icon: Calendar },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getCurrentUser();

  const handleLogout = () => {
    removeAuthToken();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 text-slate-300 z-30">
      <div>
        {/* Brand Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-wide">AI Auditor</div>
            <div className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">Automated QA</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="truncate">
            <div className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</div>
            <div className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@auditor.local'}</div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950 text-teal-400 font-bold border border-teal-800/50">
            {user?.role || 'ADMIN'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

