'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  Plus,
  Play,
  ExternalLink,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { fetchApi } from '../../../lib/api';

export default function WebsitesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('SaaS');
  const [maxPages, setMaxPages] = useState(25);
  const [maxDepth, setMaxDepth] = useState(3);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: websites = [], isLoading } = useQuery({
    queryKey: ['websites'],
    queryFn: () => fetchApi('/websites'),
  });

  const addWebsiteMutation = useMutation({
    mutationFn: (body: any) =>
      fetchApi('/websites', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      setModalOpen(false);
      setName('');
      setUrl('');
      setDescription('');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to add website');
    },
  });

  const triggerAuditMutation = useMutation({
    mutationFn: (websiteId: string) =>
      fetchApi(`/websites/${websiteId}/audits`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['websites'] });
    },
    onError: (err: any) => {
      alert(`Could not start audit: ${err.message}`);
    },
  });

  const deleteWebsiteMutation = useMutation({
    mutationFn: (websiteId: string) =>
      fetchApi(`/websites/${websiteId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    addWebsiteMutation.mutate({
      name,
      url,
      description,
      category,
      maxPages: Number(maxPages),
      maxDepth: Number(maxDepth),
    });
  };

  return (
    <div>
      <Header
        title="Websites"
        description="Manage connected domains, configure auditing policies, and trigger automated scans"
      />

      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registered Websites ({websites.length})</h2>
            <p className="text-xs text-slate-500">Every URL undergoes strict SSRF & domain validation.</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Website</span>
          </button>
        </div>

        {/* Websites Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading websites...</div>
        ) : websites.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No websites added yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Add your website URL to begin automated technical, functional, SEO, and accessibility auditing.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Add Your First Website
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map((website: any) => (
              <div
                key={website.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{website.name}</h3>
                      <a
                        href={website.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-teal-600 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span className="truncate max-w-[200px]">{website.url}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {website.category || 'General'}
                    </span>
                  </div>

                  {website.description && (
                    <p className="text-xs text-slate-500 mt-3 line-clamp-2">{website.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Health Score</span>
                      <div className="text-xl font-black text-teal-600 mt-0.5">
                        {Math.round(website.healthScore || 100)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Open Issues</span>
                      <div className="text-xl font-black text-slate-800 mt-0.5">
                        {website._count?.issues || 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => triggerAuditMutation.mutate(website.id)}
                    disabled={triggerAuditMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Audit</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Delete this website and all associated audit data?')) {
                        deleteWebsiteMutation.mutate(website.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete website"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Website Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900">Add New Website</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My SaaS Platform"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="SaaS">SaaS</option>
                  <option value="E-Commerce">E-Commerce</option>
                  <option value="Blog/Content">Blog / Content</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Pages</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Depth</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addWebsiteMutation.isPending}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {addWebsiteMutation.isPending ? 'Validating...' : 'Save Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

