import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export function SystemHealthPage() {
  const { t } = useApp();
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    const res = await api.get('/api/health');
    setLoading(false);
    if (res.data) {
      setHealth(res);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.nav.health}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real health checks against actual database latency, SSE connections, and external adapter configuration
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-800"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recheck Subsystems
        </button>
      </div>

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* PostgreSQL Component */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Database Engine</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    health.components?.database?.status === 'HEALTHY'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {health.components?.database?.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">PostgreSQL Relational DB</h3>
              <p className="text-xs text-slate-400">
                Direct pool query execution time:{' '}
                <strong className="text-teal-400 font-mono">{health.components?.database?.latencyMs}ms</strong>
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
              Authoritative datastore for all 17 clinical and operational schemas.
            </div>
          </div>

          {/* Realtime Component */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Realtime SSE</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {health.components?.realtime?.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Server-Sent Events Hub</h3>
              <p className="text-xs text-slate-400">
                Active Client Subscriptions:{' '}
                <strong className="text-teal-400 font-mono">{health.components?.realtime?.activeConnections}</strong>
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
              Low-latency event dispatch for alerts, service changes, and roster events.
            </div>
          </div>

          {/* Analytics Engine */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Analytics</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {health.components?.analyticsEngine?.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Statistical Intelligence</h3>
              <p className="text-xs text-slate-400">{health.components?.analyticsEngine?.algorithm}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
              Deterministic, explainable decision support without pseudo-predictions.
            </div>
          </div>

          {/* Email Adapter */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Gateway</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    health.components?.email?.status === 'CONFIGURED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {health.components?.email?.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">SMTP Notification Relay</h3>
              <p className="text-xs text-slate-400">{health.components?.email?.note}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
              Fail-safe architecture: in-app notifications remain active when SMTP is absent.
            </div>
          </div>

          {/* SMS Adapter */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SMS Gateway</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    health.components?.sms?.status === 'CONFIGURED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {health.components?.sms?.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Telecom Telephony Gateway</h3>
              <p className="text-xs text-slate-400">{health.components?.sms?.note}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
              Accurately reports NOT_CONFIGURED rather than pretending messages are sent.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
