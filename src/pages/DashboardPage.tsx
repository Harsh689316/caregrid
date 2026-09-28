import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  Building2,
  Stethoscope,
  AlertTriangle,
  UserCheck,
  CalendarCheck,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export function DashboardPage({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { t, user } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    const res = await api.get('/api/dashboard');
    setLoading(false);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error?.message || 'Failed to load authoritative dashboard metrics from PostgreSQL.');
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Activity className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">{t.common.loading}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
        <h3 className="font-bold text-base mb-1">Operational Data Query Failed</h3>
        <p className="text-xs text-rose-400 mb-4">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold rounded-lg border border-rose-500/30 flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t.common.retry}
        </button>
      </div>
    );
  }

  const { facilities, services, alerts, attendance, pendingLeaves, recentActivity, topAlerts } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-teal-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            {t.common.systemVerified} • POSTGRESQL AUTHORITATIVE
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.dashboard.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <strong className="text-slate-200">{user?.name}</strong> ({user?.role}) {user?.facility_name ? `• ${user.facility_name}` : '• Network Operations'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t.dashboard.refresh}
          </button>
        </div>
      </div>

      {/* 4 Essential Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Facilities */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t.dashboard.operationalFacilities}</span>
            <Building2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{facilities?.operational || 0}</span>
            <span className="text-xs text-slate-400">/ {facilities?.total || 0} Total</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {facilities?.total > 0 ? Math.round(((facilities?.operational || 0) / facilities.total) * 100) : 100}% Online
            </span>
            <button onClick={() => onNavigate('facilities')} className="text-slate-400 hover:text-white flex items-center gap-0.5">
              View <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 2: Services */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t.dashboard.totalServices}</span>
            <Stethoscope className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{services?.available || 0}</span>
            <span className="text-xs text-slate-400">/ {services?.total_services || 0} Units</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-amber-400">
              {services?.limited || 0} Limited / {services?.unavailable || 0} Unavailable
            </span>
            <button onClick={() => onNavigate('services')} className="text-slate-400 hover:text-white flex items-center gap-0.5">
              Manage <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 3: Critical Alerts */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t.dashboard.criticalAlerts}</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400">{alerts?.critical_open || 0}</span>
            <span className="text-xs text-slate-400">/ {alerts?.open_alerts || 0} Open</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className={alerts?.critical_open > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
              {alerts?.critical_open > 0 ? 'Immediate Attention' : 'Zero Escalations'}
            </span>
            <button onClick={() => onNavigate('alerts')} className="text-slate-400 hover:text-white flex items-center gap-0.5">
              Review <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 4: Attendance Today */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t.dashboard.staffAttendanceToday}</span>
            <CalendarCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{attendance?.present || 0}</span>
            <span className="text-xs text-slate-400">/ {attendance?.total_logged || 0} Present</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {attendance?.absent || 0} Absent • {attendance?.on_leave || 0} Leave
            </span>
            <button onClick={() => onNavigate('attendance')} className="text-slate-400 hover:text-white flex items-center gap-0.5">
              Roster <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Alerts & Live Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Actionable Alerts */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h2 className="font-bold text-white text-base">{t.dashboard.topAlerts}</h2>
            </div>
            <button onClick={() => onNavigate('alerts')} className="text-xs text-teal-400 hover:underline">
              View all ({alerts?.open_alerts || 0})
            </button>
          </div>

          <div className="space-y-3">
            {topAlerts?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No active operational alerts recorded.</p>
            ) : (
              topAlerts?.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
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
                      <span className="text-xs font-semibold text-slate-300 truncate">{a.facility_name}</span>
                    </div>
                    <p className="text-xs font-medium text-white truncate">{a.title}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{a.description}</p>
                  </div>
                  <button
                    onClick={() => onNavigate('alerts')}
                    className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  >
                    Action
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Immutable Audit Trail */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-400" />
              <h2 className="font-bold text-white text-base">{t.dashboard.recentActivity}</h2>
            </div>
            <button onClick={() => onNavigate('auditLogs')} className="text-xs text-teal-400 hover:underline">
              Full Log
            </button>
          </div>

          <div className="space-y-2.5">
            {recentActivity?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audit records logged yet.</p>
            ) : (
              recentActivity?.map((log: any) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-white truncate">
                      <span className="font-mono text-teal-400 mr-2">[{log.action}]</span>
                      {log.actor_name || 'System Engine'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Entity: <span className="font-mono text-slate-300">{log.entity_type} #{log.entity_id || 'N/A'}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
