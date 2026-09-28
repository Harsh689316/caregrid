import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { AlertTriangle, ShieldAlert, CheckCircle2, Clock, Filter } from 'lucide-react';

export function AlertsPage() {
  const { t, user } = useApp();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    let url = '/api/alerts?';
    if (severityFilter) url += `severity=${severityFilter}&`;
    if (statusFilter) url += `status=${statusFilter}&`;
    const res = await api.get(url);
    setLoading(false);
    if (res.success && res.data) {
      setAlerts(res.data);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter]);

  const handleUpdateStatus = async (id: number, status: 'ACKNOWLEDGED' | 'RESOLVED') => {
    const res = await api.patch(`/api/alerts/${id}/status`, { status });
    if (res.success) {
      fetchAlerts();
    }
  };

  const canAction = ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.nav.alerts}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Realtime rule-triggered operational alerts (understaffing, absenteeism surges, capacity limits)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
            No operational alerts match current filter criteria.
          </div>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${
                a.status === 'RESOLVED'
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  : a.severity === 'CRITICAL'
                  ? 'bg-rose-950/20 border-rose-500/30'
                  : a.severity === 'HIGH'
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      a.severity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : a.severity === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {a.severity}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">{a.facility_name}</span>
                  <span className="text-[10px] font-mono text-slate-500">[{a.alert_type}]</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{a.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{a.description}</p>
              </div>

              {canAction && a.status !== 'RESOLVED' && (
                <div className="flex items-center gap-2 shrink-0">
                  {a.status === 'OPEN' && (
                    <button
                      onClick={() => handleUpdateStatus(a.id, 'ACKNOWLEDGED')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateStatus(a.id, 'RESOLVED')}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl"
                  >
                    Mark Resolved
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
