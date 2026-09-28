import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { FileText, CheckCircle2, XCircle, Plus, Clock, UserCheck } from 'lucide-react';

export function LeavePage({ onTriggerBackup }: { onTriggerBackup?: (leave: any) => void }) {
  const { t, user } = useApp();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('2026-09-29');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [leaveType, setLeaveType] = useState<'CASUAL' | 'SICK' | 'EMERGENCY' | 'ANNUAL'>('CASUAL');
  const [reason, setReason] = useState('');

  const fetchLeaves = async () => {
    setLoading(true);
    const res = await api.get('/api/leave');
    setLoading(false);
    if (res.success && res.data) {
      setLeaves(res.data);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/api/leave', {
      startDate,
      endDate,
      leaveType,
      reason,
    });

    if (res.success) {
      setModalOpen(false);
      setReason('');
      fetchLeaves();
    }
  };

  const handleReview = async (id: number, action: 'APPROVE' | 'REJECT') => {
    const res = await api.patch(`/api/leave/${id}/review`, { action });
    if (res.success) {
      fetchLeaves();
    }
  };

  const canReview = ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.nav.leave}</h1>
          <p className="text-xs text-slate-400 mt-1">Staff leave workflow, supervisor approval, and backup staffing triggers</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          Submit Leave Request
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Staff</th>
                <th className="p-3.5">Facility</th>
                <th className="p-3.5">Leave Type</th>
                <th className="p-3.5">Dates</th>
                <th className="p-3.5">Reason</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-bold text-white">
                    <div>{l.staff_name}</div>
                    <span className="text-[10px] font-mono text-teal-400">{l.employee_id}</span>
                  </td>
                  <td className="p-3.5 text-slate-300">{l.facility_name}</td>
                  <td className="p-3.5 font-mono text-[10px] text-teal-300 font-semibold">{l.leave_type}</td>
                  <td className="p-3.5 font-mono text-slate-200">
                    {l.start_date} → {l.end_date}
                  </td>
                  <td className="p-3.5 text-slate-300 max-w-xs truncate">{l.reason}</td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        l.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : l.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    {canReview && l.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleReview(l.id, 'APPROVE')}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(l.id, 'REJECT')}
                          className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[10px]">
                        {l.status === 'APPROVED' ? `Approved by ${l.approved_by_name || 'Admin'}` : 'Processed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Leave Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Submit Leave Application</h3>
            <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                >
                  <option value="CASUAL">CASUAL LEAVE</option>
                  <option value="SICK">SICK LEAVE</option>
                  <option value="EMERGENCY">EMERGENCY LEAVE</option>
                  <option value="ANNUAL">ANNUAL LEAVE</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Detail the operational reason..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none placeholder:text-slate-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
