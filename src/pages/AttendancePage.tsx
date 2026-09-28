import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { CalendarCheck, CheckCircle2, Clock, XCircle, Search, Filter } from 'lucide-react';

export function AttendancePage() {
  const { t, user } = useApp();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('2026-09-28');
  const [punchModal, setPunchModal] = useState(false);
  const [punchStatus, setPunchStatus] = useState<'PRESENT' | 'LATE' | 'ABSENT' | 'HALF_DAY'>('PRESENT');
  const [remarks, setRemarks] = useState('');

  const fetchAttendance = async () => {
    setLoading(true);
    const res = await api.get(`/api/attendance?date=${dateFilter}`);
    setLoading(false);
    if (res.success && res.data) {
      setRecords(res.data);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [dateFilter]);

  const handleManualPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const res = await api.post('/api/attendance', {
      staffId: user.id,
      facilityId: user.facility_id || 1,
      date: dateFilter,
      checkIn: new Date().toTimeString().slice(0, 8),
      status: punchStatus,
      remarks,
    });

    if (res.success) {
      setPunchModal(false);
      setRemarks('');
      fetchAttendance();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.nav.attendance}</h1>
          <p className="text-xs text-slate-400 mt-1">Biometric punches and validated attendance rosters</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
          />
          <button
            onClick={() => setPunchModal(true)}
            className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20"
          >
            <CalendarCheck className="w-4 h-4" />
            Web Punch / Log
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Staff Member</th>
                <th className="p-3.5">Facility</th>
                <th className="p-3.5">Role & Specialization</th>
                <th className="p-3.5">Check-In</th>
                <th className="p-3.5">Check-Out</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Source & Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No attendance records for date {dateFilter}.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-white">
                      <div>{r.staff_name}</div>
                      <span className="text-[10px] font-mono text-teal-400">{r.employee_id}</span>
                    </td>
                    <td className="p-3.5 text-slate-300">{r.facility_name}</td>
                    <td className="p-3.5">
                      <div className="text-white">{r.staff_role}</div>
                      <span className="text-[10px] text-slate-500">{r.specialization || 'Clinical Generalist'}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-200">{r.check_in || '—'}</td>
                    <td className="p-3.5 font-mono text-slate-200">{r.check_out || '—'}</td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          r.status === 'PRESENT'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : r.status === 'LATE'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : r.status === 'LEAVE'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      <span className="font-mono text-[10px] text-slate-500 mr-2">[{r.source}]</span>
                      {r.remarks || 'Normal shift'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Punch Modal */}
      {punchModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Web Attendance Punch</h3>
            <p className="text-xs text-slate-400 mb-4">Logging attendance for {user?.name} on {dateFilter}</p>
            <form onSubmit={handleManualPunch} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Attendance Status</label>
                <select
                  value={punchStatus}
                  onChange={(e) => setPunchStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. On-site shift verified"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPunchModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl"
                >
                  Record Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
