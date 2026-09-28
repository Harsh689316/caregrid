import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { TrendingUp, AlertTriangle, CheckCircle2, BarChart2, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

export function AnalyticsPage() {
  const { t } = useApp();
  const [analytics, setAnalytics] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<number>(1);

  const fetchAnalytics = async () => {
    setLoading(true);
    const [anaRes, predRes] = await Promise.all([
      api.get(`/api/analytics/workload?facilityId=${selectedFacility}`),
      api.get(`/api/predictions?facilityId=${selectedFacility}`),
    ]);
    setLoading(false);

    if (anaRes.success && anaRes.data) {
      setAnalytics(anaRes.data);
    }
    if (predRes.success && predRes.data) {
      setPredictions(predRes.data);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedFacility]);

  const historyData = (analytics?.history || []).slice().reverse().map((h: any) => ({
    date: h.record_date.slice(5),
    volume: h.patient_volume,
    load: h.service_load,
    utilization: Number(h.utilization_rate),
    waitTime: h.waiting_time_minutes,
  }));

  const forecastData = predictions.map((p: any) => ({
    date: p.prediction_date.slice(5),
    predicted: p.predicted_demand,
    confidence: Number(p.confidence),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.nav.analytics}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Statistical operational telemetry, Z-score anomaly detection, and forward demand projections
          </p>
        </div>
        <div>
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(parseInt(e.target.value, 10))}
            className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value={1}>Aundh District Hospital</option>
            <option value={2}>Shirur Community Health Center</option>
            <option value={3}>Baramati Rural Health Center</option>
            <option value={4}>Bhor Primary Health Center</option>
            <option value={5}>Junnar Primary Health Center</option>
          </select>
        </div>
      </div>

      {/* Anomaly Detection Banners */}
      <div className="space-y-3">
        {analytics?.anomalies?.map((anom: any) => (
          <div
            key={anom.facilityId}
            className={`p-5 rounded-2xl border ${
              anom.isAnomaly ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${anom.isAnomaly ? 'text-amber-400' : 'text-emerald-400'}`} />
                <h3 className="font-bold text-white text-sm">
                  {anom.facilityName}: {anom.isAnomaly ? 'Surge Anomaly Detected' : 'Operational Baseline Normal'}
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-400">
                {anom.method}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3">{anom.explanation}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-500 block">Observed Volume</span>
                <span className="font-bold text-white">{anom.observedVolume} patients</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">30-day Baseline</span>
                <span className="font-bold text-white">{anom.baselineVolume} patients</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Deviation</span>
                <span className={`font-bold ${anom.deviationPercent > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {anom.deviationPercent > 0 ? '+' : ''}{anom.deviationPercent}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Analysis Window</span>
                <span className="font-mono text-slate-400 text-[11px]">{anom.analysisPeriod}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Historical Patient Volume & Service Load Chart */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white">Historical Patient Inflow & Service Load (27 Days)</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="volume" stroke="#14b8a6" strokeWidth={2} name="Patient Volume" dot={false} />
              <Line type="monotone" dataKey="load" stroke="#38bdf8" strokeWidth={2} name="Service Load" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forward Demand Predictions Chart */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Forward Demand Forecast (Next 7 Days)</h2>
            <p className="text-xs text-slate-400">Method: Weighted Moving Average + Day-of-Week Trend Filter</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
              />
              <Bar dataKey="predicted" fill="#6366f1" radius={[6, 6, 0, 0]} name="Predicted Inflow" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
