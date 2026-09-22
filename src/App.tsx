import React, { useState, useEffect } from 'react';
import { AppSettings, Service, AdminUser } from './types';
import {
  getPublicConfig,
  getAdminProfile,
  logoutAdmin,
  getStoredToken,
} from './services/api';
import { clientStorage, DEFAULT_SERVICES } from './services/clientStorage';
import { INITIAL_OFFICERS } from './utils/officers';
import { PublicSurveyView } from './components/PublicSurveyView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminLayout, AdminTab } from './components/AdminLayout';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminSurveyData } from './components/AdminSurveyData';
import { AdminReportView } from './components/AdminReportView';
import { AdminServicesView } from './components/AdminServicesView';
import { AdminSettingsView } from './components/AdminSettingsView';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => clientStorage.getSettings());
  const [services, setServices] = useState<Service[]>(() => clientStorage.getServices(true));
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // App View State: 'survey' | 'admin'
  const [activeView, setActiveView] = useState<'survey' | 'admin'>('survey');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  // Modals & Kiosk
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Load config & verify auth
  const loadConfig = async () => {
    try {
      const data = await getPublicConfig();
      if (data.settings) setSettings(data.settings);
      if (data.services && data.services.length > 0) {
        setServices(data.services);
      }
    } catch (err) {
      console.error('Failed to load public config:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadConfig();

    // Check existing login session
    const token = getStoredToken();
    if (token) {
      getAdminProfile()
        .then((user) => {
          setAdminUser(user);
        })
        .catch(() => {
          setAdminUser(null);
        });
    }

    // Fullscreen change listener
    const handleFullscreenChange = () => {
      setIsKioskMode(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Toggle Kiosk Mode (Fullscreen)
  const toggleKiosk = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsKioskMode(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsKioskMode(false);
        }
      }
    } catch (err) {
      console.warn('Fullscreen API error or not allowed in current iframe:', err);
      // Fallback toggle state
      setIsKioskMode(!isKioskMode);
    }
  };

  const handleOpenAdminLogin = () => {
    if (adminUser) {
      setActiveView('admin');
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleLoginSuccess = (user: AdminUser) => {
    setAdminUser(user);
    setActiveView('admin');
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setAdminUser(null);
    setActiveView('survey');
  };

  const handleReturnToSurvey = () => {
    setActiveView('survey');
    loadConfig(); // refresh active services & settings
  };

  if (isLoadingConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-blue-900 border-t-transparent animate-spin" />
          <h2 className="text-base font-bold text-slate-800">
            Memuat Sistem Survei PTUN Pangkalpinang...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      {activeView === 'survey' ? (
        <PublicSurveyView
          settings={settings}
          services={services}
          onOpenAdminLogin={handleOpenAdminLogin}
          isKioskMode={isKioskMode}
          onToggleKiosk={toggleKiosk}
        />
      ) : (
        adminUser && (
          <AdminLayout
            currentTab={adminTab}
            onTabChange={setAdminTab}
            user={adminUser}
            settings={settings}
            onLogout={handleLogout}
            onReturnToSurvey={handleReturnToSurvey}
          >
            {adminTab === 'dashboard' && <AdminDashboard />}
            {adminTab === 'surveys' && <AdminSurveyData />}
            {adminTab === 'reports' && (
              <AdminReportView
                settings={settings}
                onSettingsUpdated={(newSettings) => setSettings(newSettings)}
              />
            )}
            {adminTab === 'services' && <AdminServicesView />}
            {adminTab === 'settings' && (
              <AdminSettingsView
                settings={settings}
                onSettingsUpdated={(newSettings) => setSettings(newSettings)}
              />
            )}
          </AdminLayout>
        )
      )}

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
