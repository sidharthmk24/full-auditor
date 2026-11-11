'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Pause, Play, Trash2, X, Clock } from 'lucide-react';
import { Header } from '../../../components/layout/header';
import { fetchApi } from '../../../lib/api';

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [websiteId, setWebsiteId] = useState('');
  const [frequency, setFrequency] = useState('WEEKLY');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [hourOfDay, setHourOfDay] = useState(3);
  const [timeZone, setTimeZone] = useState('UTC');

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => fetchApi('/schedules'),
  });

  const { data: websites = [] } = useQuery({
    queryKey: ['websites'],
    queryFn: () => fetchApi('/websites'),
  });

  const createScheduleMutation = useMutation({
    mutationFn: (body: any) =>
      fetchApi('/schedules', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setModalOpen(false);
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: ({ id, isPause }: { id: string; isPause: boolean }) =>
      fetchApi(`/schedules/${id}/${isPause ? 'pause' : 'resume'}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/schedules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteId) {
      alert('Please select a website');
      return;
    }
    createScheduleMutation.mutate({
      websiteId,
      frequency,
      dayOfWeek: Number(dayOfWeek),
      hourOfDay: Number(hourOfDay),
      timeZone,
    });
  };

  return (
    <div>
      <Header
        title="Automated Audit Schedules"
        description="Configure weekly and recurring automated technical inspections"
      />

      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active Schedules ({schedules.length})</h2>
            <p className="text-xs text-slate-500">Scheduled audits run in background workers at configured times.</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Schedule</span>
          </button>
        </div>

        {/* Schedules Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading schedules...</div>
          ) : schedules.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No audit schedules configured yet. Click "Create Schedule" to set up automated weekly scans.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Website</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4">Execution Time</th>
                    <th className="py-3 px-4">Next Run</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map((schedule: any) => (
                    <tr key={schedule.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            schedule.isActive ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {schedule.isActive ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{schedule.website?.name || 'Website'}</div>
                        <div className="text-xs text-slate-400 font-mono">{schedule.website?.url}</div>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-700">{schedule.frequency}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        Day {schedule.dayOfWeek ?? 1} at {schedule.hourOfDay ?? 3}:00 {schedule.timeZone}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleDateString() : 'Pending'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() =>
                            toggleScheduleMutation.mutate({
                              id: schedule.id,
                              isPause: schedule.isActive,
                            })
                          }
                          className="p-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition"
                          title={schedule.isActive ? 'Pause' : 'Resume'}
                        >
                          {schedule.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => {
                            if (confirm('Delete this audit schedule?')) {
                              deleteScheduleMutation.mutate(schedule.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create Schedule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900">Create Audit Schedule</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Website</label>
                <select
                  required
                  value={websiteId}
                  onChange={(e) => setWebsiteId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">-- Choose a website --</option>
                  {websites.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.url})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="DAILY">Daily</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Hour (0-23)</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={hourOfDay}
                    onChange={(e) => setHourOfDay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
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
                  disabled={createScheduleMutation.isPending}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {createScheduleMutation.isPending ? 'Scheduling...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

