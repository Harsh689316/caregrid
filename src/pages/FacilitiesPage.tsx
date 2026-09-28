import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { Building2, Search, MapPin, Phone, Bed, CheckCircle2, AlertCircle, Edit3, X } from 'lucide-react';

export function FacilitiesPage() {
  const { t, user } = useApp();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
  const [editModal, setEditModal] = useState<any | null>(null);

  const fetchFacilities = async () => {
    setLoading(true);
    const res = await api.get(`/api/facilities?search=${encodeURIComponent(search)}`);
    setLoading(false);
    if (res.success && res.data) {
      setFacilities(res.data);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [search]);

  const loadFacilityDetail = async (id: number) => {
    const res = await api.get(`/api/facilities/${id}`);
    if (res.success && res.data) {
      setSelectedFacility(res.data);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    const res = await api.put(`/api/facilities/${editModal.id}`, {
      name: editModal.name,
      status: editModal.status,
      contactPhone: editModal.contact_phone,
      operatingHours: editModal.operating_hours,
      totalBeds: parseInt(editModal.total_beds, 10),
    });

    if (res.success) {
      setEditModal(null);
      fetchFacilities();
      if (selectedFacility?.facility.id === editModal.id) {
        loadFacilityDetail(editModal.id);
      }
    }
  };

  const canEdit = ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.nav.facilities}</h1>
          <p className="text-xs text-slate-400 mt-1">Authoritative registry of district hospitals, CHCs, and PHCs</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.common.search}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {facilities.map((fac) => (
          <div
            key={fac.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 font-bold border border-slate-700">
                  {fac.facility_code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    fac.status === 'OPERATIONAL'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {fac.status}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mb-1">{fac.name}</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{fac.address}, {fac.district}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 my-3 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Staff</span>
                  <span className="font-bold text-white">{fac.total_staff} Rostered</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Bed Capacity</span>
                  <span className="font-bold text-white">{fac.total_beds} Beds</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => loadFacilityDetail(fac.id)}
                className="text-teal-400 hover:underline font-semibold"
              >
                Inspect Details & Units →
              </button>
              {canEdit && (
                <button
                  onClick={() => setEditModal(fac)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                  title="Edit Facility"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Facility Detailed Drawer / Modal */}
      {selectedFacility && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{selectedFacility.facility.name}</h2>
                <span className="text-xs font-mono text-teal-400">[{selectedFacility.facility.facility_code}]</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{selectedFacility.facility.address} • Operating: {selectedFacility.facility.operating_hours}</p>
            </div>
            <button
              onClick={() => setSelectedFacility(null)}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-units Services */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Clinical & Diagnostic Units</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedFacility.services.map((s: any) => (
                <div key={s.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">{s.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Load: {s.current_load} / {s.capacity} Patients</p>
                </div>
              ))}
            </div>
          </div>

          {/* Staff Roster */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Assigned Clinical Personnel ({selectedFacility.staff.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-2.5">Staff ID</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Specialization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedFacility.staff.map((st: any) => (
                    <tr key={st.id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono text-teal-400">{st.employee_id}</td>
                      <td className="p-2.5 font-bold text-white">{st.name}</td>
                      <td className="p-2.5">{st.role}</td>
                      <td className="p-2.5 text-slate-400">{st.specialization || 'Clinical Generalist'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Facility Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Update Facility Record</h3>
              <button onClick={() => setEditModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Operational Status</label>
                <select
                  value={editModal.status}
                  onChange={(e) => setEditModal({ ...editModal, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="OPERATIONAL">OPERATIONAL</option>
                  <option value="LIMITED">LIMITED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={editModal.contact_phone}
                    onChange={(e) => setEditModal({ ...editModal, contact_phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Total Bed Capacity</label>
                  <input
                    type="number"
                    required
                    value={editModal.total_beds}
                    onChange={(e) => setEditModal({ ...editModal, total_beds: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
