import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { Network, RefreshCw, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export function DataPipelinePage() {
  const { t } = useApp();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testPayload, setTestPayload] = useState('{"staffId": 1, "facilityId": 1, "date": "2026-09-28", "status": "PRESENT"}');
  const [resultMsg, setResultMsg] = useState<any | null>(null);

  const fetchSyncEvents = async () => {
    setLoading(true);
    const res = await api.get('/api/sync');
    setLoading(false);
    if (res.success && res.data) {
      setEvents(res.data);
    }
  };

  useEffect(() => {
    fetchSyncEvents();
  }, []);

  const triggerIngest = async () => {
    try {
      const parsed = JSON.parse(testPayload);
      const res = await api.post('/api/sync/ingest', {
        sourceSystem: 'BIOMETRIC_DEVICE',
        eventType: 'BIOMETRIC_PUNCH',
        externalId: 'BIO-MANUAL-TEST-01',
        data: parsed,
      });

      setResultMsg(res.data);
      fetchSyncEvents();
    } catch (err: any) {
      alert('Invalid JSON in payload: ' + err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.nav.dataPipeline}</h1>
        <p className="text-xs text-slate-400 mt-1">
          Observability for SHA-256 deduplicated ingestion pipeline, biometrics, and state health synchronization
        </p>
      </div>

      {/* Visual Pipeline Stages */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white">Pipeline Execution Architecture</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-teal-400 font-mono block">STAGE 1</span>
            <span className="font-bold text-white">Ingestion</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-teal-400 font-mono block">STAGE 2</span>
            <span className="font-bold text-white">Validation</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-teal-400 font-mono block">STAGE 3</span>
            <span className="font-bold text-white">SHA256 Hash</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-teal-400 font-mono block">STAGE 4</span>
            <span className="font-bold text-white">Deduplication</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-teal-400 font-mono block">STAGE 5</span>
            <span className="font-bold text-white">PostgreSQL</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-teal-400 font-mono block">STAGE 6</span>
            <span className="font-bold text-white">Alert Rules</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-teal-400 font-mono block">STAGE 7</span>
            <span className="font-bold text-white">SSE Realtime</span>
          </div>
        </div>
      </div>

      {/* Manual Pipeline Ingestion Simulator */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white">Test Pipeline Ingestion & Idempotency</h2>
        <p className="text-xs text-slate-400">
          Submitting the identical payload twice verifies deterministic SHA-256 deduplication and duplicate rejection.
        </p>

        <textarea
          rows={3}
          value={testPayload}
          onChange={(e) => setTestPayload(e.target.value)}
          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-teal-300 focus:outline-none"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={triggerIngest}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2"
          >
            Dispatch Ingest Packet
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {resultMsg && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Pipeline Response: </span>
            <span className={resultMsg.status === 'DUPLICATE' ? 'text-amber-400' : 'text-emerald-400'}>
              {resultMsg.status}
            </span>
            <p className="text-slate-400 mt-1">{resultMsg.message}</p>
          </div>
        )}
      </div>

      {/* Sync Events Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Recent External Synchronization Events</h2>
          <button onClick={fetchSyncEvents} className="text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Source System</th>
                <th className="p-3.5">Event Type</th>
                <th className="p-3.5">External ID</th>
                <th className="p-3.5">Payload Hash</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Attempts</th>
                <th className="p-3.5">Received At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-bold text-white">{ev.source_system}</td>
                  <td className="p-3.5 font-mono text-teal-400">{ev.event_type}</td>
                  <td className="p-3.5 font-mono text-slate-300">{ev.external_id}</td>
                  <td className="p-3.5 font-mono text-[10px] text-slate-500 truncate max-w-xs">{ev.payload_hash}</td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        ev.status === 'PROCESSED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : ev.status === 'DUPLICATE'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {ev.status}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono">{ev.attempts}</td>
                  <td className="p-3.5 text-slate-400">{new Date(ev.received_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
