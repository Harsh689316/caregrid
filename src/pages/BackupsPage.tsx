import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { UserCheck, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';

export function BackupsPage() {
  const { t, user } = useApp();
  const [backups, setBackups] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [targetFacilityId, setTargetFacilityId] = useState<number>(1);
  const [targetDate, setTargetDate] = useState('2026-09-29');

  const fetchBackups = async () => {
    setLoading(true);
    const res = await api.get('/api/backups');
    setLoading(false);
    if (res.success && res.data) {
      setBackups(res.data);
    }
  };

  const fetchRecommendations = async () => {
    setRecLoading(true);
    const res = await api.get(`/api/backups/recommendations?facilityId=${targetFacilityId}&date=${targetDate}`);
    setRecLoading(false);
    if (res.success && res.data) {
      setRecommendations(res.data);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchRecommendations();
  }, [targetFacilityId, targetDate]);

  const handleAssign = async (rec: any) => {
    const res = await api.post('/api/backups', {
      facilityId: targetFacilityId,
      originalStaffId: 1, // Lead medical officer or staff needing coverage
      backupStaffId: rec.candidateId,
      serviceId: 1, // Emergency / clinical service
      assignmentDate: targetDate,
      shiftStart: '08:00',
      shiftEnd: '16:00',
      reason: `Automated engine allocation for date ${targetDate}`,
      explanation: rec.explanation.join(' | '),
    });

    if (res.success) {
      fetchBackups();
      fetchRecommendations();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.nav.backups}</h1>
        <p className="text-xs text-slate-400 mt-1">
          Rule-based, explainable staffing allocation engine (zero random generation • 100% database validated)
        </p>
      </div>

      {/* Engine Controls & Live Recommendations */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              Algorithmic Backup Candidates
            </h2>
            <p className="text-xs text-slate-400">Scored against roster conflict, leave approval status, workload fatigue, and specialization</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        {recLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Evaluating constraint satisfaction matrix...</div>
        ) : recommendations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No available staff match availability criteria.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, 6).map((rec) => (
              <div key={rec.candidateId} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-sm">{rec.name}</span>
                    <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                      Score: {rec.score}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{rec.role} • {rec.specialization}</p>

                  <div className="space-y-1 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 mb-4">
                    <p className="font-semibold text-slate-300 text-[10px] uppercase tracking-wider mb-1">Engine Justification:</p>
                    {rec.explanation.map((exp: string, idx: number) => (
                      <p key={idx} className={exp.startsWith('✓') ? 'text-emerald-400' : exp.startsWith('⚠') ? 'text-amber-400' : 'text-slate-400'}>
                        {exp}
                      </p>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleAssign(rec)}
                  className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  Confirm Deployment
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmed Backup Assignments Table */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Active & Historical Backup Allocations</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Facility & Service</th>
                  <th className="p-3.5">Original Staff</th>
                  <th className="p-3.5">Backup Deployed</th>
                  <th className="p-3.5">Date & Shift</th>
                  <th className="p-3.5">Reason & Explanation</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-white">
                      <div>{b.facility_name}</div>
                      <span className="text-[10px] text-teal-400 font-mono">{b.service_name}</span>
                    </td>
                    <td className="p-3.5 text-slate-300">{b.original_staff_name}</td>
                    <td className="p-3.5 font-bold text-emerald-400">{b.backup_staff_name}</td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {b.assignment_date} ({b.shift_start} - {b.shift_end})
                    </td>
                    <td className="p-3.5 text-slate-400 max-w-sm truncate" title={b.recommendation_explanation}>
                      {b.reason}
                    </td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
