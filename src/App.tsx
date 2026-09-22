import React, { useState, useEffect } from 'react';
import { AppSettings, Service, AdminUser } from './types';
import {
  getPublicConfig,
  getAdminProfile,
  logoutAdmin,
  getStoredToken,
} from './services/api';
import { DEFAULT_SERVICES } from './services/clientStorage';
import { INITIAL_OFFICERS } from './utils/officers';
import { PublicSurveyView } from './components/PublicSurveyView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminLayout, AdminTab } from './components/AdminLayout';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminSurveyData } from './components/AdminSurveyData';
import { AdminReportView } from './components/AdminReportView';
import { AdminServicesView } from './components/AdminServicesView';
import { AdminSettingsView } from './components/AdminSettingsView';

const DEFAULT_SETTINGS: AppSettings = {
  agency_name: 'PTUN Pangkalpinang',
  app_name: 'Sistem Survei Kepuasan Pelayanan',
  logo_url:
    'https://media.canva.com/v2/download/name:LOGO+PTUN+PKP+TERBARU.png/uri:ifs%3A%2F%2FM%2F1bf733e1abd446f9aed2b2ccfdec0e1e?csig=AAAAAAAAAAAAAAAAAAAAAHYjLjd8PZ86bTrKEkscibX4WCN_E_TmfdqZ2phiQ8iO&exp=1790049450&signer=media-rpc&token=AAIAAU0AIDFiZjczM2UxYWJkNDQ2ZjlhZWQyYjJjY2ZkZWMwZTFlAAAAAAGgx-fDzHYn7PAwbx-Ilh5iISgbZQRGeWSkvs2NRmgt2FeKXhlr',
  survey_title: 'SURVEI KEPUASAN PELAYANAN PETUGAS PTSP\nPTUN PANGKALPINANG',
  survey_subtitle: 'Berikan penilaian Anda terhadap pelayanan yang telah diterima.',
  success_message: 'Masukan Anda sangat membantu kami dalam meningkatkan kualitas pelayanan.',
  redirect_delay_seconds: 5,
  primary_color: '#1e3a8a',
  footer_text: 'Copyright © 2026 PTUN Pangkalpinang. All Rights Reserved.',
  service_officers: INITIAL_OFFICERS,
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
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
