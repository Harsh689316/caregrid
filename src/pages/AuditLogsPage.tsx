import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { History, Search, Filter } from 'lucide-react';

export function AuditLogsPage() {
  const { t } = useApp();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchAuditLogs = async () => {
    setLoading(true);
    let url = '/api/audit-logs?';
    if (actionFilter) url += `action=${actionFilter}&`;
    const res = await api.get(url);
    setLoading(false);
    if (res.success && res.data) {
      setLogs(res.data);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.nav.auditLogs}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable, append-only operational audit trail recording every state mutation
          </p>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
        >
          <option value="">All Actions</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          <option value="SERVICE_STATUS_CHANGED">SERVICE_STATUS_CHANGED</option>
          <option value="ATTENDANCE_UPDATED">ATTENDANCE_UPDATED</option>
          <option value="LEAVE_APPROVED">LEAVE_APPROVED</option>
          <option value="BACKUP_ASSIGNED">BACKUP_ASSIGNED</option>
          <option value="ALERT_ACKNOWLEDGED">ALERT_ACKNOWLEDGED</option>
          <option value="ALERT_RESOLVED">ALERT_RESOLVED</option>
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Entity & ID</th>
                <th className="p-3.5">New Value / Mutation</th>
                <th className="p-3.5">Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3.5">
                    <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-white">{log.actor_name || 'System Service'}</div>
                    <span className="text-[10px] text-slate-500">{log.actor_email || 'Internal Service Engine'}</span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">
                    {log.entity_type} #{log.entity_id || 'N/A'}
                  </td>
                  <td className="p-3.5 font-mono text-[10px] text-slate-400 max-w-xs truncate" title={log.new_value}>
                    {log.new_value || '—'}
                  </td>
                  <td className="p-3.5 font-mono text-[10px] text-teal-400">{log.request_id || 'internal'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
