import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  Lock,
  Database,
  Trash2,
  PlusCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Upload,
  Image,
  UserCheck,
  User,
  Camera,
  Eye,
  FileImage,
  Check,
} from 'lucide-react';
import { AppSettings, ServiceOfficer } from '../types';
import {
  updateAdminSettings,
  changeAdminPassword,
  seedDemoSurveys,
  clearDemoSurveys,
  clearAllSurveys,
  getAdminServices,
} from '../services/api';
import {
  buildRequiredOfficerList,
  DEFAULT_OFFICER_PHOTOS,
  DEFAULT_OFFICIAL_LOGO,
} from '../utils/officers';
import { CourtLogo } from './CourtLogo';
import { ConfirmModal } from './ConfirmModal';

interface AdminSettingsViewProps {
  settings: AppSettings;
  onSettingsUpdated: (updated: AppSettings) => void;
}

// Client-side image processing helper for logos: preserves transparency and optimizes dimensions
const processLogoImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 15 * 1024 * 1024) {
      reject(new Error('Ukuran file maksimal 15 MB.'));
      return;
    }

    // Keep SVG vector format untouched
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file SVG logo.'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX_DIM = 1024; // High-resolution crisp rendering
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
        const outputType = isJpeg ? 'image/jpeg' : 'image/png';
        const quality = isJpeg ? 0.92 : undefined;
        const dataUrl = canvas.toDataURL(outputType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(reader.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar logo.'));
    reader.readAsDataURL(file);
  });
};

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  onSettingsUpdated,
}) => {
  // General Settings State
  const [agencyName, setAgencyName] = useState(settings.agency_name);
  const [appName, setAppName] = useState(settings.app_name);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url);
  const [customKopUrl, setCustomKopUrl] = useState(settings.custom_kop_url || '');
  const [surveyTitle, setSurveyTitle] = useState(settings.survey_title);
  const [surveySubtitle, setSurveySubtitle] = useState(settings.survey_subtitle);
  const [successMessage, setSuccessMessage] = useState(settings.success_message);
  const [redirectDelay, setRedirectDelay] = useState(settings.redirect_delay_seconds || 5);
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color || '#1e3a8a');

  // Logo Dedicated Menu State
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isSavingLogoQuick, setIsSavingLogoQuick] = useState(false);
  const [logoSuccessMessage, setLogoSuccessMessage] = useState<string | null>(null);
  const [logoErrorMessage, setLogoErrorMessage] = useState<string | null>(null);

  // Sync when settings change from outside
  useEffect(() => {
    setLogoUrl(settings.logo_url);
  }, [settings.logo_url]);

  // Modal confirmation states
  const [isClearDemoModalOpen, setIsClearDemoModalOpen] = useState(false);
  const [isResetDbModalOpen, setIsResetDbModalOpen] = useState(false);
  const [resetInputText, setResetInputText] = useState('');
  const [footerText, setFooterText] = useState(settings.footer_text || 'Copyright © 2026 PTUN Pangkalpinang. All Rights Reserved.');

  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Database Management State
  const [dbMessage, setDbMessage] = useState<string | null>(null);
  const [isDbWorking, setIsDbWorking] = useState(false);

  // Officers Management State
  const [officers, setOfficers] = useState<ServiceOfficer[]>([]);
  const [isSavingOfficers, setIsSavingOfficers] = useState(false);
  const [officerSuccess, setOfficerSuccess] = useState<string | null>(null);
  const [officerError, setOfficerError] = useState<string | null>(null);

  useEffect(() => {
    getAdminServices()
      .then((srvs) => {
        const list = buildRequiredOfficerList(srvs, settings.service_officers);
        setOfficers(list);
      })
      .catch(console.error);
  }, [settings.service_officers]);

  const handleUpdateOfficer = (id: string, field: keyof ServiceOfficer, value: string) => {
    setOfficers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    );
  };

  const handleOfficerPhotoUpload = (id: string, file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      alert('Ukuran file foto maksimal 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      handleUpdateOfficer(id, 'photo_url', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveOfficers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingOfficers(true);
    setOfficerSuccess(null);
    setOfficerError(null);
    try {
      const updated = await updateAdminSettings({
        service_officers: officers,
      });
      onSettingsUpdated(updated);
      setOfficerSuccess('Foto dan data petugas layanan berhasil disimpan dan disinkronkan!');
      setTimeout(() => setOfficerSuccess(null), 4000);
    } catch (err: any) {
      setOfficerError(err.message || 'Gagal menyimpan data petugas.');
    } finally {
      setIsSavingOfficers(false);
    }
  };

  // Save General Settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralSuccess(null);
    setGeneralError(null);

    try {
      const updated = await updateAdminSettings({
        agency_name: agencyName,
        app_name: appName,
        logo_url: logoUrl,
        custom_kop_url: customKopUrl,
        survey_title: surveyTitle,
        survey_subtitle: surveySubtitle,
        success_message: successMessage,
        redirect_delay_seconds: Number(redirectDelay),
        primary_color: primaryColor,
        footer_text: footerText,
      });

      onSettingsUpdated(updated);
      setGeneralSuccess('Pengaturan umum berhasil disimpan.');
      setTimeout(() => setGeneralSuccess(null), 4000);
    } catch (err: any) {
      setGeneralError(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Logo File Upload Handler (PNG, JPG, SVG, WEBP)
  const handleLogoFileUpload = async (file: File) => {
    setLogoErrorMessage(null);
    setLogoSuccessMessage(null);

    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|svg|webp)$/i.test(file.name);
    if (!isImage) {
      setLogoErrorMessage('Format file tidak didukung. Harap pilih file gambar format PNG, JPG, JPEG, SVG, atau WEBP.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setLogoErrorMessage('Ukuran file gambar maksimal 15 MB.');
      return;
    }

    try {
      const dataUrl = await processLogoImageFile(file);
      setLogoUrl(dataUrl);
      setLogoSuccessMessage(`File logo "${file.name}" berhasil diimpor! Klik tombol "Simpan Logo" untuk menerapkan ke seluruh sistem.`);
      setTimeout(() => setLogoSuccessMessage(null), 5000);
    } catch (err: any) {
      setLogoErrorMessage(err.message || 'Gagal memproses file gambar logo.');
    }
  };

  // Quick save specifically for Logo
  const handleQuickSaveLogo = async () => {
    setIsSavingLogoQuick(true);
    setLogoSuccessMessage(null);
    setLogoErrorMessage(null);

    try {
      const updated = await updateAdminSettings({
        logo_url: logoUrl,
      });
      onSettingsUpdated(updated);
      setLogoSuccessMessage('Logo instansi berhasil disimpan dan disinkronkan ke seluruh aplikasi!');
      setTimeout(() => setLogoSuccessMessage(null), 4000);
    } catch (err: any) {
      setLogoErrorMessage(err.message || 'Gagal menyimpan logo instansi.');
    } finally {
      setIsSavingLogoQuick(false);
    }
  };

  // Reset to default official logo
  const handleResetDefaultLogo = () => {
    setLogoUrl(DEFAULT_OFFICIAL_LOGO);
    setLogoSuccessMessage('Logo dikembalikan ke logo resmi standar PTUN Pangkalpinang.');
    setTimeout(() => setLogoSuccessMessage(null), 4000);
  };

  // Switch to SVG vector seal
  const handleUseVectorSeal = () => {
    setLogoUrl('');
    setLogoSuccessMessage('Logo diatur menggunakan lambang segel vektor resmi Pengadilan.');
    setTimeout(() => setLogoSuccessMessage(null), 4000);
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Password baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await changeAdminPassword(currentPassword, newPassword);
      setPasswordSuccess('Password administrator berhasil diubah!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Password saat ini salah.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Demo Data Management
  const handleSeedDemo = async () => {
    setIsDbWorking(true);
    setDbMessage(null);
    try {
      const res = await seedDemoSurveys(30);
      setDbMessage(res.message);
      setTimeout(() => setDbMessage(null), 4000);
    } catch (err: any) {
      setDbMessage(err.message || 'Gagal memuat data simulasi.');
    } finally {
      setIsDbWorking(false);
    }
  };

  const executeClearDemo = async () => {
    setIsDbWorking(true);
    setDbMessage(null);
    try {
      const res = await clearDemoSurveys();
      setDbMessage(res.message);
      setIsClearDemoModalOpen(false);
      setTimeout(() => setDbMessage(null), 4000);
    } catch (err: any) {
      setDbMessage(err.message || 'Gagal menghapus data simulasi.');
    } finally {
      setIsDbWorking(false);
    }
  };

  const executeClearAll = async () => {
    setIsDbWorking(true);
    setDbMessage(null);
    try {
      const res = await clearAllSurveys();
      setDbMessage(res.message);
      setIsResetDbModalOpen(false);
      setResetInputText('');
      setTimeout(() => setDbMessage(null), 4000);
    } catch (err: any) {
      setDbMessage(err.message || 'Gagal mereset database.');
    } finally {
      setIsDbWorking(false);
    }
  };

  const isCustomFile = Boolean(logoUrl && logoUrl.startsWith('data:image/'));
  const isCustomUrl = Boolean(logoUrl && !isCustomFile && logoUrl !== DEFAULT_OFFICIAL_LOGO);
  const isOfficialDefault = Boolean(logoUrl === DEFAULT_OFFICIAL_LOGO);
  const isVectorFallback = !logoUrl;

  return (
    <div id="admin-settings-view" className="space-y-8 max-w-4xl">
      <div>
        <h3 className="text-xl font-black text-slate-900">Pengaturan Aplikasi & Keamanan</h3>
        <p className="text-xs text-slate-500">
          Kelola konfigurasi teks survei, logo instansi, keamanan akun, dan pemeliharaan database
        </p>
      </div>

      {/* Navigasi Cepat Pengaturan */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl text-xs font-bold text-slate-700">
        <a
          href="#menu-tambah-logo"
          className="px-3 py-1.5 rounded-xl bg-white text-blue-900 shadow-xs hover:bg-blue-50 flex items-center gap-1.5 transition-all"
        >
          <Image className="w-3.5 h-3.5 text-blue-900" />
          <span>Menu Tambah Logo</span>
        </a>
        <a
          href="#section-identitas"
          className="px-3 py-1.5 rounded-xl hover:bg-white/80 transition-all flex items-center gap-1.5 text-slate-600"
        >
          <span>Identitas & Teks Survei</span>
        </a>
        <a
          href="#section-petugas"
          className="px-3 py-1.5 rounded-xl hover:bg-white/80 transition-all flex items-center gap-1.5 text-slate-600"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Foto Petugas PTSP</span>
        </a>
        <a
          href="#section-keamanan"
          className="px-3 py-1.5 rounded-xl hover:bg-white/80 transition-all flex items-center gap-1.5 text-slate-600"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Ganti Password</span>
        </a>
        <a
          href="#section-database"
          className="px-3 py-1.5 rounded-xl hover:bg-white/80 transition-all flex items-center gap-1.5 text-slate-600"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Database & Demo</span>
        </a>
      </div>

      {/* MENU KHUSUS: Tambah & Kelola Logo Instansi (Import File / Gambar / URL) */}
      <div
        id="menu-tambah-logo"
        className="bg-white p-6 md:p-8 rounded-2xl border-2 border-blue-200 shadow-sm relative overflow-hidden"
      >
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-900 via-indigo-700 to-amber-500" />

        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <Image className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-extrabold text-slate-900">
                  Menu Tambah & Kelola Logo Instansi
                </h4>
                <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                  Upload File / Gambar
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Upload atau ganti file logo instansi (PNG, JPG, SVG, WEBP) untuk ditampilkan di layar survei kepuasan dan panel admin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-quick-save-logo"
              type="button"
              onClick={handleQuickSaveLogo}
              disabled={isSavingLogoQuick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingLogoQuick ? 'Menyimpan...' : 'Simpan Logo Sekarang'}</span>
            </button>
          </div>
        </div>

        {logoSuccessMessage && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{logoSuccessMessage}</span>
          </div>
        )}

        {logoErrorMessage && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{logoErrorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
          {/* Kolom Kiri: Import File Gambar & Input URL (7 Kolom) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Area Drag & Drop / File Selector */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingLogo(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingLogo(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingLogo(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleLogoFileUpload(file);
              }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                isDraggingLogo
                  ? 'border-blue-900 bg-blue-50/80 scale-[1.01]'
                  : 'border-slate-300 hover:border-blue-600 bg-slate-50/70 hover:bg-blue-50/20'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <Upload className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-black text-slate-800 mb-1">
                Tarik & Lepas File Gambar Logo ke Sini
              </h5>
              <p className="text-[11px] text-slate-500 mb-4 max-w-sm mx-auto">
                Mendukung file gambar PNG (transparansi disarankan), JPG, JPEG, SVG, dan WEBP (Maksimal 15 MB)
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Pilih / Import File Gambar Logo</span>
                  <input
                    id="input-file-logo-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoFileUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Alternatif: Masukkan Link URL Gambar */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <label className="block text-slate-700 uppercase font-bold text-[11px] mb-1.5">
                Atau Masukkan Tautan / Link URL Gambar:
              </label>
              <div className="flex gap-2">
                <input
                  id="input-url-logo"
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... (URL gambar logo online dari Canva / Web / Cloud)"
                  className="flex-1 p-2.5 rounded-xl border border-slate-300 font-medium text-xs bg-white focus:border-blue-900 outline-hidden"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Dapat berupa link gambar dari web resmi Mahkamah Agung, Canva, Google Drive, atau hosting internal.
              </p>
            </div>

            {/* Tombol Aksi Kembalikan / Reset */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={handleResetDefaultLogo}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
                title="Gunakan logo resmi standar PTUN Pangkalpinang"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-900" />
                <span>Kembalikan Logo Resmi Bawaan</span>
              </button>

              <button
                type="button"
                onClick={handleUseVectorSeal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
                title="Gunakan segel lambang vektor resmi PTUN Pangkalpinang"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Gunakan Lambang Segel Vektor</span>
              </button>
            </div>
          </div>

          {/* Kolom Kanan: Pratinjau Ganda Interaktif (5 Kolom) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-900" />
                  <span>Pratinjau Langsung (Live Preview)</span>
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  {isCustomFile
                    ? 'File Gambar Terimpor'
                    : isCustomUrl
                      ? 'Link URL Kustom'
                      : isOfficialDefault
                        ? 'Logo Resmi Bawaan'
                        : 'Segel Vektor Resmi'}
                </span>
              </div>

              {/* Box 1: Layar Survei PTSP (Latar Putih/Terang) */}
              <div className="mb-4">
                <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  1. Tampilan di Layar Survei PTSP (Latar Terang):
                </span>
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center min-h-[90px] shadow-2xs">
                  <CourtLogo url={logoUrl} size="md" />
                </div>
              </div>

              {/* Box 2: Panel Admin (Latar Gelap/Slate-900) */}
              <div>
                <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  2. Tampilan di Sidebar Panel Admin (Latar Gelap):
                </span>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-center min-h-[90px] shadow-2xs">
                  <CourtLogo url={logoUrl} size="md" />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Status: Siap diterapkan</span>
              <button
                type="button"
                onClick={handleQuickSaveLogo}
                disabled={isSavingLogoQuick}
                className="font-bold text-blue-900 hover:text-blue-950 underline cursor-pointer"
              >
                {isSavingLogoQuick ? 'Menyimpan...' : 'Simpan Sekarang →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian 1: Identitas & Teks Survei */}
      <div id="section-identitas" className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-xs">
        <h4 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
          <span>Identitas & Tampilan Survei Masyarakat</span>
        </h4>
        <p className="text-xs text-slate-500 mb-6">
          Pengaturan ini langsung tampil pada antarmuka publik yang disentuh masyarakat
        </p>

        {generalSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{generalSuccess}</span>
          </div>
        )}

        {generalError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSaveGeneral} className="space-y-5 text-xs font-semibold">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 uppercase font-bold mb-1">Nama Instansi</label>
              <input
                type="text"
                required
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-medium text-sm focus:border-blue-900 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 uppercase font-bold mb-1">Nama Aplikasi</label>
              <input
                type="text"
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-medium text-sm focus:border-blue-900 outline-hidden"
              />
            </div>
          </div>

          {/* Logo Instansi (Upload File / URL & Live Preview) */}
          <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-slate-800 uppercase font-bold text-xs">
                  Logo PTUN Pangkalpinang (Layar Survei & Admin)
                </label>
                <p className="text-[11px] text-slate-500">
                  Upload file gambar logo atau gunakan tautan URL online
                </p>
              </div>
              <a
                href="#menu-tambah-logo"
                className="text-[11px] text-blue-900 hover:text-blue-950 font-bold flex items-center gap-1"
              >
                <span>Buka Menu Upload Lengkap ↑</span>
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Masukkan URL logo atau pilih file gambar di samping"
                className="flex-1 w-full p-3 rounded-xl border border-slate-300 font-medium text-xs bg-white focus:border-blue-900 outline-hidden"
              />

              <label className="shrink-0 flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-blue-900 border border-blue-200 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload File Gambar</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoFileUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>

              <div className="p-2 border border-slate-200 rounded-xl bg-white flex items-center gap-2 shrink-0">
                <CourtLogo url={logoUrl} size="sm" />
                <span className="text-[10px] text-slate-400">Pratinjau</span>
              </div>
            </div>
          </div>

          {/* Kop Surat Laporan (Upload File / URL) */}
          <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-slate-800 uppercase font-bold text-xs">
                  Gambar Kop Surat Laporan Cetak
                </label>
                <p className="text-[11px] text-slate-500">
                  Upload file gambar kop surat resmi (PNG/JPG/SVG) atau masukkan link URL
                </p>
              </div>
              {customKopUrl && (
                <button
                  type="button"
                  onClick={() => setCustomKopUrl('')}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Kembalikan Kop Standar</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="text"
                value={customKopUrl}
                onChange={(e) => setCustomKopUrl(e.target.value)}
                placeholder="Masukkan URL gambar kop surat atau upload dari komputer"
                className="flex-1 w-full p-3 rounded-xl border border-slate-300 font-medium text-xs bg-white focus:border-blue-900 outline-hidden"
              />

              <label className="shrink-0 flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-blue-900 border border-blue-200 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload File Gambar</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 8 * 1024 * 1024) {
                      alert('Ukuran file maksimal 8 MB');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCustomKopUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>

            {/* Preview Box */}
            <div className="p-3 border border-slate-200 rounded-xl bg-white flex items-center justify-center min-h-16">
              {customKopUrl ? (
                <img
                  src={customKopUrl}
                  alt="Pratinjau Kop Laporan"
                  className="max-h-24 max-w-full object-contain mx-auto"
                />
              ) : (
                <span className="text-[11px] text-slate-400">
                  Menggunakan Kop Standar PTUN Pangkalpinang (Lambang Mahkamah Agung & Teks Peradilan)
                </span>
              )}
            </div>
          </div>

          {/* Judul & Subjudul Survei */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 uppercase font-bold mb-1">Judul Survei</label>
              <textarea
                rows={2}
                value={surveyTitle}
                onChange={(e) => setSurveyTitle(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-medium text-sm focus:border-blue-900 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 uppercase font-bold mb-1">Subjudul Penjelasan</label>
              <textarea
                rows={2}
                value={surveySubtitle}
                onChange={(e) => setSurveySubtitle(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-medium text-sm focus:border-blue-900 outline-hidden"
              />
            </div>
          </div>

          {/* Pesan Sukses & Countdown delay */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-slate-700 uppercase font-bold mb-1">
                Pesan Konfirmasi Setelah Survei
              </label>
              <input
                type="text"
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-medium text-sm focus:border-blue-900 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 uppercase font-bold mb-1">
                Durasi Otomatis Kembali (detik)
              </label>
              <input
                type="number"
                min={3}
                max={60}
                value={redirectDelay}
                onChange={(e) => setRedirectDelay(Number(e.target.value))}
                className="w-full p-3 rounded-xl border border-slate-300 font-medium text-sm focus:border-blue-900 outline-hidden"
              />
            </div>
          </div>

          {/* Footer Text */}
          <div>
            <label className="block text-slate-700 uppercase font-bold mb-1">
              Teks Hak Cipta / Footer (Halaman 1 sampai 3)
            </label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 font-medium text-sm focus:border-blue-900 outline-hidden"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              id="btn-save-general-settings"
              type="submit"
              disabled={isSavingGeneral}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingGeneral ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Bagian 2: Foto & Data Petugas Pelayanan PTSP */}
      <div id="section-petugas" className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                Foto & Identitas Petugas Pelayanan PTSP
              </h4>
              <p className="text-xs text-slate-500">
                Kelola foto dan nama petugas untuk setiap meja / loket. Foto ini otomatis sinkron dan muncul di layar pilihan layanan serta layar penilaian masyarakat.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSaveOfficers()}
            disabled={isSavingOfficers}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingOfficers ? 'Menyimpan...' : 'Simpan Foto & Data Petugas'}</span>
          </button>
        </div>

        {officerSuccess && (
          <div className="my-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{officerSuccess}</span>
          </div>
        )}

        {officerError && (
          <div className="my-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            {officerError}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {officers.map((officer, idx) => (
            <div
              key={officer.id}
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                {/* Photo Preview & Upload Trigger */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="relative group">
                    <img
                      src={officer.photo_url || DEFAULT_OFFICER_PHOTOS[idx % DEFAULT_OFFICER_PHOTOS.length]}
                      alt={officer.officer_name}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-blue-900 shadow-sm bg-white"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_OFFICER_PHOTOS[0];
                      }}
                    />
                    <label
                      title="Klik untuk upload foto baru"
                      className="absolute inset-0 bg-slate-900/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[10px] font-bold text-center p-1"
                    >
                      <Camera className="w-5 h-5 mb-1" />
                      <span>Ubah Foto</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleOfficerPhotoUpload(officer.id, file);
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Foto</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleOfficerPhotoUpload(officer.id, file);
                        }}
                      />
                    </label>
                    <span className="text-[10px] text-slate-400">Format: JPG, PNG, WEBP</span>
                  </div>
                </div>

                {/* Info Fields */}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2 flex items-center justify-between">
                    <span className="inline-block text-[11px] font-black uppercase tracking-wider text-blue-900 bg-blue-100 px-3 py-1 rounded-lg">
                      {officer.service_title}
                    </span>
                    {officer.sub_service_name && (
                      <span className="text-[11px] font-bold text-slate-400">
                        Sub-Layanan PTSP
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                      Nama Petugas Layanan *
                    </label>
                    <input
                      type="text"
                      value={officer.officer_name}
                      onChange={(e) => handleUpdateOfficer(officer.id, 'officer_name', e.target.value)}
                      placeholder="Contoh: Siti Rahmawati, S.Kom."
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs bg-white focus:border-blue-900 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                      Jabatan / Peran Petugas
                    </label>
                    <input
                      type="text"
                      value={officer.officer_role || ''}
                      onChange={(e) => handleUpdateOfficer(officer.id, 'officer_role', e.target.value)}
                      placeholder="Contoh: Petugas Informasi & Pengaduan"
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs bg-white focus:border-blue-900 outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-500 font-bold uppercase mb-1 text-[10px]">
                      Atau URL Link Gambar Foto:
                    </label>
                    <input
                      type="text"
                      value={officer.photo_url}
                      onChange={(e) => handleUpdateOfficer(officer.id, 'photo_url', e.target.value)}
                      placeholder="https://... (URL foto petugas)"
                      className="w-full p-2 rounded-xl border border-slate-200 font-mono text-[11px] bg-white focus:border-blue-900 outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => handleSaveOfficers()}
            disabled={isSavingOfficers}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingOfficers ? 'Menyimpan...' : 'Simpan Foto & Data Petugas'}</span>
          </button>
        </div>
      </div>

      {/* Bagian 3: Keamanan Akun & Ganti Password */}
      <div id="section-keamanan" className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-xs">
        <h4 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-900" />
          <span>Keamanan Akun Administrator</span>
        </h4>
        <p className="text-xs text-slate-500 mb-6">
          Password dienkripsi secara aman dengan algoritma bcrypt sebelum disimpan di database
        </p>

        {passwordSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            {passwordError}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs font-semibold">
          <div>
            <label className="block text-slate-700 uppercase font-bold mb-1">
              Password Saat Ini *
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Masukkan password admin saat ini"
              className="w-full p-3 rounded-xl border border-slate-300 font-medium text-sm focus:border-blue-900 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-slate-700 uppercase font-bold mb-1">
              Password Baru (Minimal 6 Karakter) *
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Masukkan password baru"
              className="w-full p-3 rounded-xl border border-slate-300 font-medium text-sm focus:border-blue-900 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-slate-700 uppercase font-bold mb-1">
              Konfirmasi Password Baru *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password baru"
              className="w-full p-3 rounded-xl border border-slate-300 font-medium text-sm focus:border-blue-900 outline-hidden"
            />
          </div>

          <div className="pt-2">
            <button
              id="btn-change-password-submit"
              type="submit"
              disabled={isSavingPassword}
              className="px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingPassword ? 'Memperbarui...' : 'Ubah Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Bagian 4: Pemeliharaan Database & Manajemen Data Demo */}
      <div id="section-database" className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-xs">
        <h4 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-900" />
          <span>Pemeliharaan Database & Data Simulasi</span>
        </h4>
        <p className="text-xs text-slate-500 mb-6">
          Sesuai ketentuan, data simulasi dapat dimuat untuk menguji grafik dan dibersihkan kapan saja
          tanpa mengganggu data asli masyarakat.
        </p>

        {dbMessage && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
            <span>{dbMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Seed demo */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
                <PlusCircle className="w-4 h-4 text-blue-700" />
                <span>Muat Data Demo</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Tambahkan 30 data survei simulasi untuk menguji kalkulasi dashboard, IKM, dan grafik.
              </p>
            </div>
            <button
              type="button"
              disabled={isDbWorking}
              onClick={handleSeedDemo}
              className="mt-4 w-full py-2.5 rounded-lg bg-blue-900 text-white text-xs font-bold hover:bg-blue-950 transition-colors disabled:opacity-50"
            >
              Tambah 30 Data Demo
            </button>
          </div>

          {/* Clear demo only */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-1">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Hapus Data Demo</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Menghapus hanya data survei berlabel demo. Data survei asli dari masyarakat tidak akan
                terhapus.
              </p>
            </div>
            <button
              type="button"
              disabled={isDbWorking}
              onClick={() => setIsClearDemoModalOpen(true)}
              className="mt-4 w-full py-2.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Bersihkan Data Demo
            </button>
          </div>

          {/* Reset all surveys */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Reset Total Database</span>
              </div>
              <p className="text-xs text-rose-600/80 font-normal">
                Mengosongkan seluruh data survei (0 respon) sebelum aplikasi resmi difungsikan di meja PTSP.
              </p>
            </div>
            <button
              type="button"
              disabled={isDbWorking}
              onClick={() => {
                setResetInputText('');
                setIsResetDbModalOpen(true);
              }}
              className="mt-4 w-full py-2.5 rounded-lg bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Kosongkan Seluruh Data
            </button>
          </div>
        </div>
      </div>

      {/* Modal Bersihkan Demo */}
      <ConfirmModal
        isOpen={isClearDemoModalOpen}
        title="Bersihkan Data Simulasi?"
        message="Tindakan ini akan menghapus semua survei yang berlabel demo. Data survei riil dari masyarakat tidak akan terhapus."
        confirmLabel="Ya, Bersihkan Data Demo"
        cancelLabel="Batal"
        variant="warning"
        isLoading={isDbWorking}
        onConfirm={executeClearDemo}
        onCancel={() => setIsClearDemoModalOpen(false)}
      />

      {/* Modal Khusus Reset Total Database */}
      {isResetDbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-rose-200 relative animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-2">
              Konfirmasi Reset Total Database
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              PERINGATAN: Tindakan ini akan mengosongkan <strong>SELURUH</strong> data survei di database (menjadi 0 data respon). Tindakan ini permanen dan tidak dapat dibatalkan.
            </p>

            <div className="mb-5">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Ketik kata <span className="text-rose-700 font-mono font-black">RESET</span> untuk konfirmasi:
              </label>
              <input
                type="text"
                value={resetInputText}
                onChange={(e) => setResetInputText(e.target.value.toUpperCase())}
                placeholder="RESET"
                className="w-full px-4 py-3 rounded-xl border-2 border-rose-200 focus:border-rose-600 font-mono font-bold text-sm tracking-widest text-center text-rose-900 outline-hidden"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsResetDbModalOpen(false);
                  setResetInputText('');
                }}
                disabled={isDbWorking}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeClearAll}
                disabled={resetInputText !== 'RESET' || isDbWorking}
                className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
              >
                {isDbWorking ? 'Mereset Database...' : 'Konfirmasi Kosongkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
