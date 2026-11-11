'use client';

import React from 'react';
import { Bell, Search } from 'lucide-react';

export function Header({ title, description }: { title: string; description?: string }) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audits, URLs, issues..."
            className="pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 w-64 transition"
          />
        </div>

        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-teal-500 absolute top-1.5 right-1.5"></span>
        </button>
      </div>
    </header>
  );
}

