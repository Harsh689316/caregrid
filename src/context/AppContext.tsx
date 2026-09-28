import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { translations, Language, Translations } from '../i18n';

export type Theme = 'dark' | 'light' | 'contrast';

export interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'DISTRICT_ADMIN' | 'FACILITY_ADMIN' | 'MEDICAL_OFFICER' | 'STAFF' | 'VIEWER';
  facility_id: number | null;
  facility_name?: string;
  preferred_language: string;
}

interface AppContextType {
  user: User | null;
  setUser: (u: User | null) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: Translations;
  logout: () => Promise<void>;
  realtimeConnected: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('caregrid_lang') as Language) || 'en';
  });
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('caregrid_theme') as Theme) || 'dark';
  });
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);

  const setLanguage = (l: Language) => {
    setLanguageState(l);
    localStorage.setItem('caregrid_lang', l);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('caregrid_theme', t);
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', {});
    } finally {
      api.setToken(null);
      setUser(null);
    }
  };

  // Restore authenticated session
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.get<User>('/api/auth/me').then((res) => {
        if (res.success && res.data) {
          setUser(res.data);
          if (res.data.preferred_language && ['en', 'hi', 'mr'].includes(res.data.preferred_language)) {
            setLanguage(res.data.preferred_language as Language);
          }
        } else {
          api.setToken(null);
          setUser(null);
        }
      });
    }
  }, []);

  // SSE Realtime Connection
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      setRealtimeConnected(true);
    };

    eventSource.onerror = () => {
      setRealtimeConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const t = translations[language] || translations.en;

  return (
    <AppContext.Provider value={{ user, setUser, language, setLanguage, theme, setTheme, t, logout, realtimeConnected }}>
      <div className={theme === 'light' ? 'theme-light' : theme === 'contrast' ? 'theme-contrast' : 'theme-dark'}>
        {children}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
