import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { ServicesPage } from './pages/ServicesPage';
import { AttendancePage } from './pages/AttendancePage';
import { LeavePage } from './pages/LeavePage';
import { BackupsPage } from './pages/BackupsPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DataPipelinePage } from './pages/DataPipelinePage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';

export default function App() {
  const { user } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
      {currentTab === 'facilities' && <FacilitiesPage />}
      {currentTab === 'services' && <ServicesPage />}
      {currentTab === 'attendance' && <AttendancePage />}
      {currentTab === 'leave' && <LeavePage />}
      {currentTab === 'backups' && <BackupsPage />}
      {currentTab === 'alerts' && <AlertsPage />}
      {currentTab === 'analytics' && <AnalyticsPage />}
      {currentTab === 'predictions' && <AnalyticsPage />}
      {currentTab === 'dataPipeline' && <DataPipelinePage />}
      {currentTab === 'auditLogs' && <AuditLogsPage />}
      {currentTab === 'health' && <SystemHealthPage />}
      {/* Fallback to dashboard */}
      {![
        'dashboard', 'facilities', 'services', 'attendance', 'leave',
        'backups', 'alerts', 'analytics', 'predictions', 'dataPipeline',
        'auditLogs', 'health',
      ].includes(currentTab) && <DashboardPage onNavigate={setCurrentTab} />}
    </AppLayout>
  );
}
