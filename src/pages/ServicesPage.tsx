import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { Stethoscope, AlertTriangle, CheckCircle2, Clock, X, ArrowRight } from 'lucide-react';

export function ServicesPage() {
  const { t, user } = useApp();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalService, setModalService] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE' | 'EMERGENCY_ONLY'>('AVAILABLE');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    const res = await api.get('/api/services');
    setLoading(false);
    if (res.success && res.data) {
      setServices(res.data);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openStatusModal = (service: any) => {
    setModalService(service);
    setNewStatus(service.status);
    setReason('');
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalService) return;

    setIsSubmitting(true);
    const res = await api.patch(`/api/services/${modalService.id}/availability`, {
      status: newStatus,
      reason,
    });
    setIsSubmitting(false);

    if (res.success) {
      setModalService(null);
      fetchServices();
    }
  };

  const canMutate = ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.nav.services}</h1>
          <p className="text-xs text-slate-400 mt-1">Live clinical and diagnostic availability linked to alert engine and audit logs</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Service Name</th>
                <th className="p-3.5">Facility</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Capacity / Load</th>
                <th className="p-3.5">Hours</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-white flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal-400" />
                    {s.name}
                  </td>
                  <td className="p-3.5 text-slate-300">{s.facility_name}</td>
                  <td className="p-3.5">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {s.category}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        s.status === 'AVAILABLE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : s.status === 'LIMITED'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">
                    {s.current_load} / {s.capacity} patients
                  </td>
                  <td className="p-3.5 text-slate-400">{s.operating_hours}</td>
                  <td className="p-3.5 text-right">
                    {canMutate ? (
                      <button
                        onClick={() => openStatusModal(s)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                      >
                        Change Status
                      </button>
                    ) : (
                      <span className="text-slate-600 text-[10px]">Read-only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Status Modal */}
      {modalService && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Alter Service Availability</h3>
                <p className="text-xs text-slate-400">{modalService.name} @ {modalService.facility_name}</p>
              </div>
              <button onClick={() => setModalService(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusChange} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">New Operational Availability</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500 font-medium"
                >
                  <option value="AVAILABLE">AVAILABLE (Normal operational capacity)</option>
                  <option value="LIMITED">LIMITED (Staff shortage or equipment constraint)</option>
                  <option value="UNAVAILABLE">UNAVAILABLE (Triggers critical alert)</option>
                  <option value="EMERGENCY_ONLY">EMERGENCY_ONLY (Antenatal / critical only)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Mandatory Operational Justification</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Night shift lab technician unavailable; backup cross-facility technician requested."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Transaction Cascade:</p>
                <p>✓ Writes change to <code className="text-teal-400 font-mono">services</code> & <code className="text-teal-400 font-mono">service_availability</code></p>
                <p>✓ Logs immutable audit record with your user ID</p>
                <p>✓ Broadcasts event via SSE to connected operations dashboards</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalService(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? 'Committing...' : 'Commit Mutation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
