export type Language = 'en' | 'hi' | 'mr';

export interface Translations {
  appName: string;
  subtitle: string;
  nav: {
    dashboard: string;
    facilities: string;
    services: string;
    staff: string;
    attendance: string;
    scheduling: string;
    leave: string;
    backups: string;
    alerts: string;
    notifications: string;
    analytics: string;
    predictions: string;
    dataPipeline: string;
    auditLogs: string;
    health: string;
    settings: string;
  };
  dashboard: {
    title: string;
    welcome: string;
    networkOverview: string;
    operationalFacilities: string;
    totalServices: string;
    criticalAlerts: string;
    staffAttendanceToday: string;
    present: string;
    late: string;
    absent: string;
    onLeave: string;
    pendingLeaveRequests: string;
    recentActivity: string;
    topAlerts: string;
    refresh: string;
  };
  common: {
    status: string;
    operational: string;
    limited: string;
    unavailable: string;
    action: string;
    filter: string;
    search: string;
    date: string;
    facility: string;
    role: string;
    submit: string;
    cancel: string;
    save: string;
    confirm: string;
    exportCsv: string;
    loading: string;
    error: string;
    empty: string;
    retry: string;
    acknowledge: string;
    resolve: string;
    assignBackup: string;
    recommended: string;
    systemVerified: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'CAREGRID',
    subtitle: 'Healthcare Operations & Intelligence Platform',
    nav: {
      dashboard: 'Dashboard',
      facilities: 'Facilities',
      services: 'Services & Availability',
      staff: 'Staff Directory',
      attendance: 'Attendance',
      scheduling: 'Shift Scheduling',
      leave: 'Leave Management',
      backups: 'Backup Staffing Engine',
      alerts: 'Operational Alerts',
      notifications: 'Notifications',
      analytics: 'Workload & Anomalies',
      predictions: 'Demand Forecast',
      dataPipeline: 'Data Pipeline & Sync',
      auditLogs: 'Audit Trail',
      health: 'System Health',
      settings: 'Settings & Rules',
    },
    dashboard: {
      title: 'Operations Command Console',
      welcome: 'Healthcare Operations Overview',
      networkOverview: 'Network Health Summary',
      operationalFacilities: 'Operational Facilities',
      totalServices: 'Active Clinical Services',
      criticalAlerts: 'Critical Open Alerts',
      staffAttendanceToday: 'Shift Attendance Today',
      present: 'Present',
      late: 'Late',
      absent: 'Absent',
      onLeave: 'On Leave',
      pendingLeaveRequests: 'Pending Leave Approvals',
      recentActivity: 'Immutable Audit Trail',
      topAlerts: 'Actionable Operational Alerts',
      refresh: 'Live Synchronize',
    },
    common: {
      status: 'Status',
      operational: 'Operational',
      limited: 'Limited',
      unavailable: 'Unavailable',
      action: 'Action',
      filter: 'Filter',
      search: 'Search...',
      date: 'Date',
      facility: 'Facility',
      role: 'Role',
      submit: 'Submit',
      cancel: 'Cancel',
      save: 'Save Changes',
      confirm: 'Confirm',
      exportCsv: 'Export CSV',
      loading: 'Loading authoritative data...',
      error: 'An operational error occurred',
      empty: 'No records found matching criteria',
      retry: 'Retry Request',
      acknowledge: 'Acknowledge',
      resolve: 'Resolve',
      assignBackup: 'Assign Backup',
      recommended: 'Engine Recommended',
      systemVerified: 'System Verified',
    },
  },
  hi: {
    appName: 'केयरग्रिड (CAREGRID)',
    subtitle: 'स्वास्थ्य सेवा संचालन एवं बुद्धिमत्ता प्रणाली',
    nav: {
      dashboard: 'डैशबोर्ड',
      facilities: 'स्वास्थ्य केंद्र (Facilities)',
      services: 'सेवाएं और उपलब्धता',
      staff: 'कर्मचारी निर्देशिका',
      attendance: 'उपस्थिति (Attendance)',
      scheduling: 'ड्यूटी रोस्टर / शिफ्ट',
      leave: 'अवकाश प्रबंधन (Leave)',
      backups: 'बैकअप स्टाफिंग इंजन',
      alerts: 'परिचालन चेतावनी (Alerts)',
      notifications: 'सूचनाएं (Notifications)',
      analytics: 'कार्यभार विश्लेषण',
      predictions: 'मांग पूर्वानुमान (Forecast)',
      dataPipeline: 'डेटा पाइपलाइन व सिंक',
      auditLogs: 'ऑडिट लॉग (Audit Trail)',
      health: 'सिस्टम स्वास्थ्य',
      settings: 'नियम व सेटिंग्स',
    },
    dashboard: {
      title: 'संचालन नियंत्रण कंसोल',
      welcome: 'स्वास्थ्य सेवा परिचालन अवलोकन',
      networkOverview: 'नेटवर्क स्वास्थ्य स्थिति',
      operationalFacilities: 'कार्यशील केंद्र',
      totalServices: 'सक्रिय चिकित्सीय सेवाएं',
      criticalAlerts: 'गंभीर सक्रिय अलर्ट',
      staffAttendanceToday: 'आज की स्टाफ उपस्थिति',
      present: 'उपस्थित',
      late: 'विलंबित (Late)',
      absent: 'अनुपस्थित',
      onLeave: 'अवकाश पर',
      pendingLeaveRequests: 'लंबित अवकाश अनुमोदन',
      recentActivity: 'अपरिवर्तनीय ऑडिट ट्रेल',
      topAlerts: 'प्राथमिकता परिचालन अलर्ट',
      refresh: 'लाइव सिंक करें',
    },
    common: {
      status: 'स्थिति',
      operational: 'पूर्णतः कार्यशील',
      limited: 'सीमित',
      unavailable: 'अनुपलब्ध',
      action: 'कार्रवाई',
      filter: 'फ़िल्टर',
      search: 'खोजें...',
      date: 'तारीख',
      facility: 'स्वास्थ्य केंद्र',
      role: 'भूमिका',
      submit: 'जमा करें',
      cancel: 'रद्द करें',
      save: 'सहेजें',
      confirm: 'पुष्टि करें',
      exportCsv: 'CSV निर्यात करें',
      loading: 'डेटा लोड हो रहा है...',
      error: 'एक परिचालन त्रुटि हुई',
      empty: 'कोई रिकॉर्ड नहीं मिला',
      retry: 'पुनः प्रयास करें',
      acknowledge: 'स्वीकार करें (Acknowledge)',
      resolve: 'समाधान करें (Resolve)',
      assignBackup: 'बैकअप नियुक्त करें',
      recommended: 'इंजन अनुशंसित',
      systemVerified: 'प्रणाली द्वारा सत्यापित',
    },
  },
  mr: {
    appName: 'केअरग्रिड (CAREGRID)',
    subtitle: 'आरोग्य सेवा संचलन व गुप्तवार्ता प्रणाली',
    nav: {
      dashboard: 'डॅशबोर्ड',
      facilities: 'आरोग्य केंद्रे',
      services: 'सेवा आणि उपलब्धता',
      staff: 'कर्मचारी यादी',
      attendance: 'हजेरी (Attendance)',
      scheduling: 'पाळी नियोजन (Scheduling)',
      leave: 'रजा व्यवस्थापन (Leave)',
      backups: 'बॅकअप कर्मचारी नियोजन',
      alerts: 'संचलन सूचना (Alerts)',
      notifications: 'अधिसूचना (Notifications)',
      analytics: 'कामाचा ताण विश्लेषण',
      predictions: 'मागणी अंदाज (Demand Forecast)',
      dataPipeline: 'माहिती पाइपलाइन व सिंक',
      auditLogs: 'ऑडिट ट्रेल (Audit Logs)',
      health: 'प्रणाली स्थिती (System Health)',
      settings: 'नियम व सेटिंग्ज',
    },
    dashboard: {
      title: 'संचलन नियंत्रण कक्ष',
      welcome: 'आरोग्य संचलन आढावा',
      networkOverview: 'जिल्हा नेटवर्क सारांश',
      operationalFacilities: 'सुरू असलेली केंद्रे',
      totalServices: 'सक्रिय आरोग्य सेवा',
      criticalAlerts: 'तातडीचे अलर्ट',
      staffAttendanceToday: 'आजची कर्मचारी हजेरी',
      present: 'हजर',
      late: 'उशिरा',
      absent: 'गैरहजर',
      onLeave: 'रजेवर',
      pendingLeaveRequests: 'प्रलंबित रजा अर्ज',
      recentActivity: 'अखंड ऑडिट नोंद',
      topAlerts: 'तातडीच्या संचलन सूचना',
      refresh: 'थेट अद्यतनित करा',
    },
    common: {
      status: 'स्थिती',
      operational: 'सुरू (कार्यरत)',
      limited: 'मर्यादित',
      unavailable: 'अनुपलब्ध',
      action: 'कृती',
      filter: 'फिल्टर',
      search: 'शोधा...',
      date: 'दिनांक',
      facility: 'आरोग्य केंद्र',
      role: 'पद / भूमिका',
      submit: 'सादर करा',
      cancel: 'रद्द करा',
      save: 'बदल जतन करा',
      confirm: 'निश्चित करा',
      exportCsv: 'CSV डाउनलोड करा',
      loading: 'माहिती लोड होत आहे...',
      error: 'संचलन त्रुटी आली आहे',
      empty: 'नोंद उपलब्ध नाही',
      retry: 'पुन्हा प्रयत्न करा',
      acknowledge: 'नोंद घेतली',
      resolve: 'निवारण झाले',
      assignBackup: 'बॅकअप कर्मचारी द्या',
      recommended: 'प्रणालीने शिफारस केलेले',
      systemVerified: 'प्रणाली सत्यापित',
    },
  },
};
