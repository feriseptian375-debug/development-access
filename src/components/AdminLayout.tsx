import React, { useState } from 'react';
import {
  LayoutDashboard,
  Table as TableIcon,
  FileSpreadsheet,
  Layers,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { AdminUser, AppSettings } from '../types';
import { CourtLogo } from './CourtLogo';

export type AdminTab = 'dashboard' | 'surveys' | 'reports' | 'services' | 'settings';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  user: AdminUser;
  settings: AppSettings;
  onLogout: () => void;
  onReturnToSurvey: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onTabChange,
  user,
  settings,
  onLogout,
  onReturnToSurvey,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'surveys' as AdminTab, label: 'Data Survei', icon: TableIcon },
    { id: 'reports' as AdminTab, label: 'Laporan', icon: FileSpreadsheet },
    { id: 'services' as AdminTab, label: 'Jenis Layanan', icon: Layers },
    { id: 'settings' as AdminTab, label: 'Pengaturan', icon: SettingsIcon },
  ];

  return (
    <div id="admin-layout-root" className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900">
      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        className={`bg-slate-900 text-white shrink-0 transition-all duration-300 flex flex-col justify-between border-r border-slate-800 z-30 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <CourtLogo url={settings.logo_url} size="sm" />
              {!isSidebarCollapsed && (
                <div className="flex flex-col truncate">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest leading-none">
                    Admin Panel
                  </span>
                  <span className="text-sm font-extrabold text-white truncate leading-tight mt-0.5">
                    PTUN PKP
                  </span>
                </div>
              )}
            </div>

            <button
              id="btn-collapse-sidebar"
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isSidebarCollapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer / User Info */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* Quick return to survey */}
          <button
            id="btn-back-to-kiosk-view"
            type="button"
            onClick={onReturnToSurvey}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/80 transition-colors ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Buka Layar Survei Masyarakat"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Layar Survei PTSP</span>}
          </button>

          {/* User profile & Logout */}
          <div
            className={`flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-amber-300 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">{user.full_name || user.username}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{user.role}</div>
                </div>
              </div>
            )}

            <button
              id="btn-admin-logout"
              type="button"
              onClick={onLogout}
              className="p-2 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg transition-colors"
              title="Logout / Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 capitalize">
              {menuItems.find((m) => m.id === currentTab)?.label || 'Dashboard'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Pengadilan Tata Usaha Negara Pangkalpinang • Panel Petugas & Administrator
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReturnToSurvey}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Layar Survei Masyarakat
            </button>
          </div>
        </header>

        {/* Tab Body */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
