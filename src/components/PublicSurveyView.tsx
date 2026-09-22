import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Building2,
  Info,
  FileText,
  Laptop,
  Scale,
  Layers,
  CheckCircle2,
  ChevronLeft,
  Send,
  Maximize2,
  Minimize2,
  Lock,
  Sparkles,
  HelpCircle,
  Clock,
  CreditCard,
  Mail,
  FolderCheck,
} from 'lucide-react';
import { AppSettings, Service, RatingValue } from '../types';
import { submitSurvey } from '../services/api';
import { CourtLogo } from './CourtLogo';
import { getOfficerForService, DEFAULT_OFFICER_PHOTOS } from '../utils/officers';

interface PublicSurveyViewProps {
  settings: AppSettings;
  services: Service[];
  onOpenAdminLogin: () => void;
  isKioskMode: boolean;
  onToggleKiosk: () => void;
}

export const PublicSurveyView: React.FC<PublicSurveyViewProps> = ({
  settings,
  services,
  onOpenAdminLogin,
  isKioskMode,
  onToggleKiosk,
}) => {
  // Step 1: Layanan Utama / Sub-Layanan, Step 2: Rating, Step 3: Saran, Step 4: Sukses
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSubService, setSelectedSubService] = useState<string | null>(null);
  const [isSelectingSubService, setIsSelectingSubService] = useState(false);
  const [selectedRating, setSelectedRating] = useState<RatingValue | null>(null);
  const [feedbackChoice, setFeedbackChoice] = useState<'ada' | 'tidak_ada'>('tidak_ada');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(settings.redirect_delay_seconds || 5);

  const currentOfficer = selectedService
    ? getOfficerForService(settings.service_officers, selectedService.id, selectedSubService)
    : null;

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Icon mapping helper for main services
  const renderServiceIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Building2':
        return <Building2 className="w-10 h-10 md:w-12 md:h-12" />;
      case 'Info':
        return <Info className="w-10 h-10 md:w-12 md:h-12" />;
      case 'FileText':
        return <FileText className="w-10 h-10 md:w-12 md:h-12" />;
      case 'Laptop':
        return <Laptop className="w-10 h-10 md:w-12 md:h-12" />;
      case 'Scale':
        return <Scale className="w-10 h-10 md:w-12 md:h-12" />;
      default:
        return <Layers className="w-10 h-10 md:w-12 md:h-12" />;
    }
  };

  // Icon mapping helper for sub-services (meja / loket PTSP)
  const renderSubServiceIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('informasi') || lower.includes('pengaduan')) {
      return <HelpCircle className="w-10 h-10 md:w-12 md:h-12" />;
    }
    if (lower.includes('kasir') || lower.includes('biaya') || lower.includes('bayar')) {
      return <CreditCard className="w-10 h-10 md:w-12 md:h-12" />;
    }
    if (lower.includes('surat') || lower.includes('penerimaan')) {
      return <Mail className="w-10 h-10 md:w-12 md:h-12" />;
    }
    if (lower.includes('e-court') || lower.includes('ecourt') || lower.includes('online')) {
      return <Laptop className="w-10 h-10 md:w-12 md:h-12" />;
    }
    if (lower.includes('meja 3') || lower.includes('meja tiga')) {
      return <FolderCheck className="w-10 h-10 md:w-12 md:h-12" />;
    }
    return <Layers className="w-10 h-10 md:w-12 md:h-12" />;
  };

  const getSubServiceDescription = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('informasi') && lower.includes('pengaduan')) {
      return 'Konsultasi peradilan, informasi perkara & layanan pengaduan';
    }
    if (lower.includes('meja 3')) {
      return 'Pelayanan administrasi perkara dan kelengkapan berkas Meja 3';
    }
    if (lower.includes('kasir')) {
      return 'Pembayaran panjar biaya perkara & administrasi kasir peradilan';
    }
    if (lower.includes('surat')) {
      return 'Penerimaan surat masuk, surat dinas & persuratan perkara';
    }
    if (lower.includes('e-court')) {
      return 'Layanan pendaftaran perkara online (e-Filing, e-Payment, e-Summons)';
    }
    return 'Layanan loket pelayanan terpadu satu pintu';
  };

  // Reset form completely
  const resetForm = () => {
    setCurrentStep(1);
    setIsSelectingSubService(false);
    setSelectedService(null);
    setSelectedSubService(null);
    setSelectedRating(null);
    setFeedbackChoice('tidak_ada');
    setFeedbackText('');
    setErrorMessage(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Inactivity timeout: if left untouched in SubService selection, Step 2 or 3 for 60 seconds, auto-reset to Step 1
  useEffect(() => {
    const handleUserActivity = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (isSelectingSubService || currentStep === 2 || currentStep === 3) {
        inactivityTimerRef.current = setTimeout(() => {
          resetForm();
        }, 60000); // 60 seconds inactivity reset
      }
    };

    window.addEventListener('click', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    handleUserActivity();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [currentStep, isSelectingSubService]);

  // Handle Step 1: Select Main Service
  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setErrorMessage(null);
    if (service.sub_services && service.sub_services.length > 0) {
      setIsSelectingSubService(true);
      setSelectedSubService(null);
    } else {
      setIsSelectingSubService(false);
      setSelectedSubService(null);
      setCurrentStep(2);
    }
  };

  // Handle Step 1b: Select Sub-Service (Meja PTSP)
  const handleSelectSubService = (subName: string) => {
    setSelectedSubService(subName);
    setErrorMessage(null);
    setCurrentStep(2);
  };

  // Handle Step 2: Select Rating
  const handleSelectRating = (rating: RatingValue) => {
    setSelectedRating(rating);
    setErrorMessage(null);
    setCurrentStep(3);
  };

  // Handle Step 3: Submit Survey
  const handleSubmit = async () => {
    if (!selectedService || !selectedRating) {
      setErrorMessage('Silakan pilih jenis layanan dan berikan penilaian terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitSurvey({
        service_id: selectedService.id,
        sub_service_name: selectedSubService || undefined,
        rating: selectedRating,
        feedback_choice: feedbackChoice,
        feedback: feedbackChoice === 'ada' ? feedbackText : '',
      });

      // Move to Step 4: Success confirmation
      setCurrentStep(4);
      triggerCelebration();

      // Start countdown timer to redirect
      const redirectSeconds = settings.redirect_delay_seconds || 5;
      setCountdown(redirectSeconds);

      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      let counter = redirectSeconds;
      countdownIntervalRef.current = setInterval(() => {
        counter -= 1;
        setCountdown(counter);
        if (counter <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          resetForm();
        }
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Data belum dapat disimpan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modern celebration confetti for Step 4
  const triggerCelebration = () => {
    try {
      const count = 120;
      const defaults = {
        origin: { y: 0.65 },
        spread: 80,
        ticks: 200,
        gravity: 1.1,
        colors: ['#1e3a8a', '#2563eb', '#10b981', '#f59e0b', '#3b82f6'],
      };
      confetti({ ...defaults, particleCount: Math.floor(count * 0.4) });
      setTimeout(() => {
        confetti({ ...defaults, particleCount: Math.floor(count * 0.3), origin: { x: 0.3, y: 0.6 } });
      }, 200);
      setTimeout(() => {
        confetti({ ...defaults, particleCount: Math.floor(count * 0.3), origin: { x: 0.7, y: 0.6 } });
      }, 350);
    } catch {
      // Canvas confetti fallback
    }
  };

  return (
    <div
      id="public-survey-root"
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white"
    >
      {/* Top Bar / Header */}
      <header
        id="survey-header"
        className="w-full bg-white border-b border-slate-200/80 shadow-xs px-4 py-3 md:px-8 md:py-4 sticky top-0 z-30 transition-all"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-5">
            <CourtLogo url={settings.logo_url} size="md" />
            <div>
              <span className="inline-block text-[11px] md:text-xs font-bold tracking-wider text-blue-900 uppercase bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-200/60 mb-0.5">
                Pengadilan Tata Usaha Negara Pangkalpinang
              </span>
              <h1 className="text-sm md:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                SISTEM SURVEI KEPUASAN PELAYANAN PTSP
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Kiosk Mode Toggle */}
            <button
              id="btn-toggle-kiosk"
              type="button"
              onClick={onToggleKiosk}
              title={isKioskMode ? 'Keluar Mode Kiosk' : 'Masuk Mode Kiosk (Layar Penuh)'}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                isKioskMode
                  ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isKioskMode ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Kiosk Aktif</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Mode Kiosk</span>
                </>
              )}
            </button>

            {/* Admin Login Button */}
            <button
              id="btn-admin-login-entry"
              type="button"
              onClick={onOpenAdminLogin}
              title="Akses Dashboard Petugas / Admin"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-8 lg:py-10 flex flex-col justify-center">
        {/* Error Alert if any */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            id="survey-error-alert"
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-center font-medium shadow-xs"
          >
            {errorMessage}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: PILIHAN JENIS LAYANAN UTAMA */}
          {currentStep === 1 && !isSelectingSubService && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              id="step-services-selection"
              className="w-full text-center flex flex-col items-center"
            >
              <div className="mb-6 md:mb-10 max-w-3xl">
                <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-blue-900 bg-blue-100/70 px-3 py-1 rounded-full">
                  Langkah 1 dari 3
                </span>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
                  SURVEI KEPUASAN PELAYANAN PETUGAS PTSP
                </h2>
                <h3 className="text-lg md:text-xl font-bold text-blue-900 mt-1">
                  PTUN PANGKALPINANG
                </h3>
                <p className="text-base md:text-lg text-slate-600 mt-2 font-normal">
                  {settings.survey_subtitle || 'Berikan penilaian Anda terhadap pelayanan yang telah diterima.'}
                </p>
                <div className="w-20 h-1 bg-blue-800 mx-auto mt-4 rounded-full" />
              </div>

              {/* Service Cards Grid - Big Touchscreen Friendly Cards */}
              <div
                id="services-cards-grid"
                className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
              >
                {services.map((service, index) => {
                  const off = getOfficerForService(settings.service_officers, service.id);
                  return (
                    <motion.button
                      key={service.id}
                      id={`service-card-${service.id}`}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectService(service)}
                      className="group relative flex flex-col items-center justify-center p-6 md:p-8 bg-white hover:bg-blue-50/50 rounded-2xl border-2 border-slate-200/90 hover:border-blue-700 shadow-sm hover:shadow-lg transition-all text-center min-h-[180px] md:min-h-[200px] focus:outline-hidden focus:ring-4 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-blue-50 text-blue-900 group-hover:bg-blue-900 group-hover:text-white flex items-center justify-center mb-4 transition-colors shadow-xs">
                        {renderServiceIcon(service.icon_name)}
                      </div>
                      <span className="text-xs font-bold text-blue-900/70 uppercase tracking-wider mb-1">
                        Layanan #{index + 1}
                      </span>
                      <h4 className="text-lg md:text-xl font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                        {service.name}
                      </h4>
                      {service.description && (
                        <p className="text-xs md:text-sm text-slate-500 mt-1.5 line-clamp-2 font-normal">
                          {service.description}
                        </p>
                      )}

                      {service.sub_services && service.sub_services.length > 0 ? (
                        <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
                          {service.sub_services.length} Loket / Meja Layanan
                        </span>
                      ) : (
                        <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 group-hover:bg-blue-100/50 border border-slate-200/80 transition-colors">
                          <img
                            src={off.photo_url}
                            alt={off.officer_name}
                            className="w-7 h-7 rounded-full object-cover border border-blue-900 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_OFFICER_PHOTOS[0];
                            }}
                          />
                          <div className="text-left text-[11px] leading-tight truncate">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Petugas</span>
                            <span className="font-bold text-slate-800 truncate">{off.officer_name}</span>
                          </div>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs md:text-sm text-slate-500 bg-white/80 backdrop-blur-xs px-4 py-2 rounded-full border border-slate-200 shadow-xs">
                <HelpCircle className="w-4 h-4 text-blue-800" />
                <span>Sentuh salah satu kotak layanan di atas untuk memulai penilaian</span>
              </div>
            </motion.div>
          )}

          {/* STEP 1b: PILIHAN MEJA / LOKET PELAYANAN PTSP */}
          {currentStep === 1 && isSelectingSubService && selectedService && (
            <motion.div
              key="step-1-subservices"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              id="step-subservices-selection"
              className="w-full text-center flex flex-col items-center"
            >
              {/* Back to main service selector */}
              <div className="w-full flex justify-start mb-4">
                <button
                  id="btn-back-to-main-services"
                  type="button"
                  onClick={() => {
                    setIsSelectingSubService(false);
                    setSelectedService(null);
                    setSelectedSubService(null);
                  }}
                  className="flex items-center gap-2 text-sm md:text-base font-semibold text-slate-600 hover:text-blue-900 bg-white hover:bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 transition-all shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Kembali ke Pilihan Layanan Utama
                </button>
              </div>

              <div className="mb-6 md:mb-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-wider text-blue-900 bg-blue-100/70 px-4 py-1.5 rounded-full mb-3">
                  <Building2 className="w-4 h-4" />
                  <span>Kategori: {selectedService.name}</span>
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                  PILIH LOKET / MEJA PELAYANAN PTSP
                </h2>
                <p className="text-base md:text-lg text-slate-600 mt-2 font-normal">
                  Silakan sentuh meja atau loket pelayanan PTSP yang Anda tuju:
                </p>
                <div className="w-20 h-1 bg-blue-800 mx-auto mt-4 rounded-full" />
              </div>

              {/* Sub-Services Grid */}
              <div
                id="sub-services-cards-grid"
                className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl"
              >
                {(selectedService.sub_services || []).map((subName, index) => {
                  const off = getOfficerForService(settings.service_officers, selectedService.id, subName);
                  return (
                    <motion.button
                      key={subName}
                      id={`sub-service-card-${index}`}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectSubService(subName)}
                      className="group relative flex flex-col items-center justify-center p-6 md:p-8 bg-white hover:bg-blue-50/60 rounded-3xl border-2 border-slate-200 hover:border-blue-700 shadow-sm hover:shadow-xl transition-all text-center min-h-[220px] md:min-h-[240px] focus:outline-hidden focus:ring-4 focus:ring-blue-500/20 cursor-pointer"
                    >
                      {/* Officer Photo Avatar with Badge */}
                      <div className="relative mb-3">
                        <img
                          src={off.photo_url}
                          alt={off.officer_name}
                          className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-3 border-blue-900 shadow-md mx-auto group-hover:scale-105 transition-transform bg-slate-100"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_OFFICER_PHOTOS[0];
                          }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-900 text-white rounded-full flex items-center justify-center shadow-xs border-2 border-white">
                          <span className="scale-65 origin-center">{renderSubServiceIcon(subName)}</span>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-blue-900/70 uppercase tracking-wider mb-1">
                        Loket #{index + 1}
                      </span>
                      <h4 className="text-lg md:text-xl font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                        {subName}
                      </h4>
                      <p className="text-xs font-black text-blue-900 mt-1">
                        {off.officer_name}
                      </p>
                      {off.officer_role && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {off.officer_role}
                        </span>
                      )}
                      <p className="text-xs text-slate-500 mt-2 font-normal line-clamp-2">
                        {getSubServiceDescription(subName)}
                      </p>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs md:text-sm text-slate-500 bg-white/80 backdrop-blur-xs px-4 py-2 rounded-full border border-slate-200 shadow-xs">
                <HelpCircle className="w-4 h-4 text-blue-800" />
                <span>Sentuh salah satu meja di atas untuk melanjutkan ke penilaian</span>
              </div>
            </motion.div>
          )}

          {/* STEP 2: PENILAIAN RATING */}
          {currentStep === 2 && selectedService && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              id="step-rating-selection"
              className="w-full text-center flex flex-col items-center"
            >
              {/* Back to service or subservice selector */}
              <div className="w-full flex justify-start mb-4">
                <button
                  id="btn-back-to-step1"
                  type="button"
                  onClick={() => {
                    if (selectedService.sub_services && selectedService.sub_services.length > 0) {
                      setIsSelectingSubService(true);
                      setCurrentStep(1);
                    } else {
                      setIsSelectingSubService(false);
                      setSelectedService(null);
                      setSelectedSubService(null);
                      setCurrentStep(1);
                    }
                    setSelectedRating(null);
                  }}
                  className="flex items-center gap-2 text-sm md:text-base font-semibold text-slate-600 hover:text-blue-900 bg-white hover:bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 transition-all shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                  {selectedService.sub_services && selectedService.sub_services.length > 0
                    ? 'Ganti Loket / Meja PTSP'
                    : 'Ganti Jenis Layanan'}
                </button>
              </div>

              {/* Officer Spotlight Card in Step 2 */}
              {currentOfficer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 w-full max-w-xl bg-white rounded-3xl p-5 md:p-6 border-2 border-blue-200/90 shadow-sm flex items-center gap-4 md:gap-5 text-left"
                >
                  <div className="relative shrink-0">
                    <img
                      src={currentOfficer.photo_url}
                      alt={currentOfficer.officer_name}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-3 border-blue-900 shadow-md bg-slate-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_OFFICER_PHOTOS[0];
                      }}
                    />
                    <div
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs"
                      title="Petugas Aktif Bertugas"
                    >
                      ✓
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-blue-900 bg-blue-100/80 px-2.5 py-0.5 rounded-full mb-1">
                      Petugas Pelayanan PTSP
                    </span>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 truncate">
                      {currentOfficer.officer_name}
                    </h3>
                    <p className="text-xs md:text-sm font-bold text-blue-900 truncate">
                      {selectedSubService ? `${selectedSubService}` : selectedService.name}
                    </p>
                    {currentOfficer.officer_role && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate font-normal">
                        {currentOfficer.officer_role}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="mb-6 md:mb-8 max-w-2xl">
                <div className="inline-flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-wider text-blue-900 bg-blue-100/70 px-4 py-1.5 rounded-full mb-3">
                  <span>Layanan Dipilih:</span>
                  <span className="text-blue-950 font-black">
                    {selectedService.name}
                    {selectedSubService ? ` • ${selectedSubService}` : ''}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Bagaimana penilaian Anda terhadap pelayanan kami?
                </h2>
                <p className="text-slate-600 mt-2 text-base md:text-lg">
                  {currentOfficer ? (
                    <>
                      Sentuh salah satu emotikon di bawah ini sesuai pengalaman yang Anda rasakan bersama{' '}
                      <strong className="text-blue-900 font-bold">{currentOfficer.officer_name}</strong>:
                    </>
                  ) : (
                    'Sentuh salah satu emotikon di bawah ini sesuai pengalaman yang Anda rasakan.'
                  )}
                </p>
              </div>

              {/* 4 Large Touch Buttons */}
              <div
                id="rating-buttons-grid"
                className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl"
              >
                {/* 1. SANGAT PUAS */}
                <motion.button
                  id="btn-rating-sangat-puas"
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectRating('sangat_puas')}
                  className="group relative flex flex-col items-center justify-center p-6 md:p-8 bg-white hover:bg-emerald-50/70 rounded-3xl border-3 border-emerald-200 hover:border-emerald-600 shadow-sm hover:shadow-xl transition-all min-h-[220px] md:min-h-[260px] cursor-pointer"
                >
                  <span className="text-6xl md:text-7xl lg:text-8xl mb-4 group-hover:scale-115 transition-transform duration-200 select-none">
                    😊
                  </span>
                  <span className="text-lg md:text-xl lg:text-2xl font-black text-emerald-800 tracking-wide">
                    SANGAT PUAS
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-3 py-0.5 rounded-full mt-2">
                    Skor: 4
                  </span>
                </motion.button>

                {/* 2. PUAS */}
                <motion.button
                  id="btn-rating-puas"
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectRating('puas')}
                  className="group relative flex flex-col items-center justify-center p-6 md:p-8 bg-white hover:bg-blue-50/70 rounded-3xl border-3 border-blue-200 hover:border-blue-600 shadow-sm hover:shadow-xl transition-all min-h-[220px] md:min-h-[260px] cursor-pointer"
                >
                  <span className="text-6xl md:text-7xl lg:text-8xl mb-4 group-hover:scale-115 transition-transform duration-200 select-none">
                    🙂
                  </span>
                  <span className="text-lg md:text-xl lg:text-2xl font-black text-blue-900 tracking-wide">
                    PUAS
                  </span>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-3 py-0.5 rounded-full mt-2">
                    Skor: 3
                  </span>
                </motion.button>

                {/* 3. CUKUP */}
                <motion.button
                  id="btn-rating-cukup"
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectRating('cukup')}
                  className="group relative flex flex-col items-center justify-center p-6 md:p-8 bg-white hover:bg-amber-50/70 rounded-3xl border-3 border-amber-200 hover:border-amber-600 shadow-sm hover:shadow-xl transition-all min-h-[220px] md:min-h-[260px] cursor-pointer"
                >
                  <span className="text-6xl md:text-7xl lg:text-8xl mb-4 group-hover:scale-115 transition-transform duration-200 select-none">
                    😐
                  </span>
                  <span className="text-lg md:text-xl lg:text-2xl font-black text-amber-800 tracking-wide">
                    CUKUP
                  </span>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-0.5 rounded-full mt-2">
                    Skor: 2
                  </span>
                </motion.button>

                {/* 4. TIDAK PUAS */}
                <motion.button
                  id="btn-rating-tidak-puas"
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectRating('tidak_puas')}
                  className="group relative flex flex-col items-center justify-center p-6 md:p-8 bg-white hover:bg-rose-50/70 rounded-3xl border-3 border-rose-200 hover:border-rose-600 shadow-sm hover:shadow-xl transition-all min-h-[220px] md:min-h-[260px] cursor-pointer"
                >
                  <span className="text-6xl md:text-7xl lg:text-8xl mb-4 group-hover:scale-115 transition-transform duration-200 select-none">
                    🙁
                  </span>
                  <span className="text-lg md:text-xl lg:text-2xl font-black text-rose-800 tracking-wide">
                    TIDAK PUAS
                  </span>
                  <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-3 py-0.5 rounded-full mt-2">
                    Skor: 1
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: FORM SARAN & MASUKAN */}
          {currentStep === 3 && selectedService && selectedRating && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              id="step-feedback-form"
              className="w-full flex flex-col items-center max-w-2xl mx-auto"
            >
              {/* Back to rating */}
              <div className="w-full flex justify-start mb-4">
                <button
                  id="btn-back-to-step2"
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 text-sm md:text-base font-semibold text-slate-600 hover:text-blue-900 bg-white hover:bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 transition-all shadow-xs"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Ubah Penilaian
                </button>
              </div>

              <div className="w-full bg-white rounded-3xl border-2 border-slate-200 shadow-lg p-6 md:p-10 text-center">
                <div className="flex items-center justify-center gap-4 mb-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {currentOfficer && (
                    <img
                      src={currentOfficer.photo_url}
                      alt={currentOfficer.officer_name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-900 shrink-0 shadow-xs"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_OFFICER_PHOTOS[0];
                      }}
                    />
                  )}
                  <span className="text-4xl">
                    {selectedRating === 'sangat_puas' && '😊'}
                    {selectedRating === 'puas' && '🙂'}
                    {selectedRating === 'cukup' && '😐'}
                    {selectedRating === 'tidak_puas' && '🙁'}
                  </span>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Penilaian Anda untuk Petugas:
                    </span>
                    <h3 className="text-base md:text-lg font-black text-blue-900 uppercase">
                      {selectedRating.replace('_', ' ')} • {currentOfficer?.officer_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {selectedService.name}
                      {selectedSubService ? ` - ${selectedSubService}` : ''}
                    </p>
                  </div>
                </div>

                <div className="w-16 h-1 bg-slate-200 mx-auto my-5 rounded-full" />

                <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
                  Apakah Anda memiliki saran atau masukan?
                </h3>
                <p className="text-sm md:text-base text-slate-500 mb-6">
                  Saran Anda sangat berarti bagi peningkatan kualitas pelayanan kami.
                </p>

                {/* Option: Tidak ada vs Ada */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    id="choice-feedback-tidak-ada"
                    type="button"
                    onClick={() => setFeedbackChoice('tidak_ada')}
                    className={`py-4 px-6 rounded-2xl font-bold text-base md:text-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      feedbackChoice === 'tidak_ada'
                        ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Tidak Ada</span>
                  </button>

                  <button
                    id="choice-feedback-ada"
                    type="button"
                    onClick={() => setFeedbackChoice('ada')}
                    className={`py-4 px-6 rounded-2xl font-bold text-base md:text-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      feedbackChoice === 'ada'
                        ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Ada</span>
                  </button>
                </div>

                {/* Conditional Textarea when 'Ada' */}
                <AnimatePresence>
                  {feedbackChoice === 'ada' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-6 text-left"
                    >
                      <label
                        htmlFor="textarea-feedback"
                        className="block text-sm font-bold text-slate-700 mb-2"
                      >
                        Tuliskan saran atau masukan Anda:
                      </label>
                      <textarea
                        id="textarea-feedback"
                        rows={4}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Tuliskan saran atau masukan Anda di sini (opsional)..."
                        className="w-full p-4 rounded-2xl border-2 border-slate-300 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 text-base outline-hidden transition-all bg-slate-50/50"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  id="btn-submit-survey"
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-black text-xl md:text-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Mengirimkan Penilaian...</span>
                  ) : (
                    <>
                      <span>KIRIM PENILAIAN</span>
                      <Send className="w-6 h-6" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: KONFIRMASI SUKSES (Alightmotion style modern animation) */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              id="step-success-confirmation"
              className="w-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-4"
            >
              {/* Alightmotion glowing animated badge */}
              <div className="relative mb-8 flex items-center justify-center">
                {/* Outer pulsing ring */}
                <motion.div
                  animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.35, 0.1, 0.35],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute w-36 h-36 md:w-44 md:h-44 rounded-full bg-emerald-400"
                />

                {/* Inner glowing circle */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
                  className="relative w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-2xl border-4 border-white"
                >
                  <CheckCircle2 className="w-16 h-16 md:w-20 md:h-20 stroke-[2.2]" />
                </motion.div>

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-2 -right-2 text-amber-400"
                >
                  <Sparkles className="w-8 h-8" />
                </motion.div>
              </div>

              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3"
              >
                TERIMA KASIH
              </motion.h2>

              {currentOfficer && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                  className="mb-4 inline-flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border-2 border-blue-200 shadow-xs"
                >
                  <img
                    src={currentOfficer.photo_url}
                    alt={currentOfficer.officer_name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-900 shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_OFFICER_PHOTOS[0];
                    }}
                  />
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Petugas yang Dinilai:
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 block">
                      {currentOfficer.officer_name}
                    </span>
                    <span className="text-xs font-semibold text-blue-900 block">
                      {selectedSubService || selectedService?.name}
                    </span>
                  </div>
                </motion.div>
              )}

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg md:text-xl font-bold text-blue-900 mb-2"
              >
                "Penilaian Anda untuk pelayanan {selectedService?.name}
                {selectedSubService ? ` (${selectedSubService})` : ''} telah berhasil diterima."
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-base md:text-lg text-slate-600 max-w-md mx-auto mb-8 font-normal leading-relaxed"
              >
                "{settings.success_message || 'Masukan Anda sangat membantu kami dalam meningkatkan kualitas pelayanan.'}"
              </motion.p>

              {/* Countdown Progress Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-md flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-900 font-extrabold flex items-center justify-center border border-blue-200">
                  {countdown}
                </div>
                <div className="text-left">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Otomatis Kembali</div>
                  <div className="text-sm font-bold text-slate-800">
                    Ke halaman awal dalam {countdown} detik
                  </div>
                </div>
                <button
                  id="btn-finish-now"
                  type="button"
                  onClick={resetForm}
                  className="ml-2 px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-bold hover:bg-blue-950 transition-colors"
                >
                  Selesai Sekarang
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER: Required on pages 1 to 3 */}
      {currentStep !== 4 && (
        <footer
          id="survey-footer"
          className="w-full bg-white/90 border-t border-slate-200 py-3 px-4 text-center select-none"
        >
          <p className="text-xs md:text-sm font-semibold text-slate-600 tracking-wide">
            {settings.footer_text || 'Copyright © 2026 PTUN Pangkalpinang. All Rights Reserved.'}
          </p>
        </footer>
      )}
    </div>
  );
};
