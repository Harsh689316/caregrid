import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Building2,
  Stethoscope,
  Users,
  CalendarCheck,
  CalendarDays,
  FileText,
  UserCheck,
  AlertTriangle,
  Bell,
  TrendingUp,
  BrainCircuit,
  Network,
  History,
  ShieldCheck,
  Settings,
  LogOut,
  Globe,
  Sun,
  Moon,
  Contrast,
  Menu,
  X,
  Radio,
} from 'lucide-react';

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export function AppLayout({ currentTab, setCurrentTab, children }: LayoutProps) {
  const { user, logout, language, setLanguage, theme, setTheme, t, realtimeConnected } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'STAFF', 'VIEWER'] },
    { id: 'facilities', label: t.nav.facilities, icon: Building2, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'VIEWER'] },
    { id: 'services', label: t.nav.services, icon: Stethoscope, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'VIEWER'] },
    { id: 'staff', label: t.nav.staff, icon: Users, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'VIEWER'] },
    { id: 'attendance', label: t.nav.attendance, icon: CalendarCheck, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'STAFF', 'VIEWER'] },
    { id: 'scheduling', label: t.nav.scheduling, icon: CalendarDays, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'STAFF', 'VIEWER'] },
    { id: 'leave', label: t.nav.leave, icon: FileText, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'STAFF'] },
    { id: 'backups', label: t.nav.backups, icon: UserCheck, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER'] },
    { id: 'alerts', label: t.nav.alerts, icon: AlertTriangle, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'VIEWER'] },
    { id: 'notifications', label: t.nav.notifications, icon: Bell, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'STAFF', 'VIEWER'] },
    { id: 'analytics', label: t.nav.analytics, icon: TrendingUp, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'VIEWER'] },
    { id: 'predictions', label: t.nav.predictions, icon: BrainCircuit, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'VIEWER'] },
    { id: 'dataPipeline', label: t.nav.dataPipeline, icon: Network, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN'] },
    { id: 'auditLogs', label: t.nav.auditLogs, icon: History, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN'] },
    { id: 'health', label: t.nav.health, icon: ShieldCheck, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'STAFF', 'VIEWER'] },
    { id: 'settings', label: t.nav.settings, icon: Settings, roles: ['SUPER_ADMIN', 'DISTRICT_ADMIN'] },
  ];

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">CG</div>
          <span className="font-bold tracking-tight text-white">CAREGRID</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex flex-col w-full md:w-64 bg-slate-900/90 border-r border-slate-800 shrink-0 h-auto md:h-screen sticky top-0 z-30`}
      >
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 hidden md:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base tracking-tight leading-none">CAREGRID</h2>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">HEALTHCARE OPS</span>
            </div>
          </div>
          {realtimeConnected ? (
            <span className="flex items-center gap-1.5 text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20" title="Connected to Server-Sent Events stream">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
              LIVE
            </span>
          ) : (
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              CONNECTING
            </span>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-teal-400' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info & Controls */}
        <div className="p-3 border-t border-slate-800 space-y-3 bg-slate-950/40">
          <div className="flex items-center justify-between px-1">
            {/* Language Switcher */}
            <div className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                aria-label="Language selection"
                className="bg-slate-800 text-[11px] text-slate-300 rounded px-1.5 py-1 border border-slate-700 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="mr">मराठी</option>
              </select>
            </div>

            {/* Theme Switcher */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTheme('dark')}
                title="Dark theme"
                className={`p-1 rounded ${theme === 'dark' ? 'bg-slate-800 text-teal-400' : 'text-slate-500'}`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('light')}
                title="Light theme"
                className={`p-1 rounded ${theme === 'light' ? 'bg-slate-800 text-teal-400' : 'text-slate-500'}`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('contrast')}
                title="High contrast theme"
                className={`p-1 rounded ${theme === 'contrast' ? 'bg-slate-800 text-amber-400' : 'text-slate-500'}`}
              >
                <Contrast className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-teal-400 font-mono truncate">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
