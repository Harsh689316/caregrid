import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { Shield, Lock, Mail, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';

export function LoginPage() {
  const { setUser, setLanguage, t } = useApp();
  const [email, setEmail] = useState('admin@caregrid.org');
  const [password, setPassword] = useState('Caregrid@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await api.post('/api/auth/login', { email, password });
    setLoading(false);

    if (res.success && res.data) {
      api.setToken(res.data.token);
      setUser(res.data.user);
      if (res.data.user.preferredLanguage) {
        setLanguage(res.data.user.preferredLanguage as any);
      }
    } else {
      setError(res.error?.message || 'Login failed. Please verify credentials.');
    }
  };

  const setPresetUser = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Caregrid@2026');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              CAREGRID
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">v2.4 PROD</span>
            </h1>
            <p className="text-xs text-slate-400">Healthcare Operations & Intelligence</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Official Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                placeholder="name@caregrid.org"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations Console'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Role Switcher for seamless test review */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Login (Production Seed Roles):</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setPresetUser('admin@caregrid.org')}
              className="p-2 text-left bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors"
            >
              <span className="font-semibold block text-teal-400">Super Admin</span>
              admin@caregrid.org
            </button>
            <button
              onClick={() => setPresetUser('district.pune@caregrid.org')}
              className="p-2 text-left bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors"
            >
              <span className="font-semibold block text-cyan-400">District Admin</span>
              district.pune@caregrid.org
            </button>
            <button
              onClick={() => setPresetUser('aundh.admin@caregrid.org')}
              className="p-2 text-left bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors"
            >
              <span className="font-semibold block text-indigo-400">Facility Admin</span>
              aundh.admin@caregrid.org
            </button>
            <button
              onClick={() => setPresetUser('mo.aundh1@caregrid.org')}
              className="p-2 text-left bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors"
            >
              <span className="font-semibold block text-emerald-400">Medical Officer</span>
              mo.aundh1@caregrid.org
            </button>
            <button
              onClick={() => setPresetUser('nurse.pooja@caregrid.org')}
              className="p-2 text-left bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors"
            >
              <span className="font-semibold block text-amber-400">Staff Nurse</span>
              nurse.pooja@caregrid.org
            </button>
            <button
              onClick={() => setPresetUser('viewer@caregrid.org')}
              className="p-2 text-left bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors"
            >
              <span className="font-semibold block text-purple-400">Auditor / Viewer</span>
              viewer@caregrid.org
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 text-center">Password for all seed users: <code className="text-slate-400 font-mono">Caregrid@2026</code></p>
        </div>
      </div>
    </div>
  );
}
