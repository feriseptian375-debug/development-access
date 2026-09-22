import {
  AppSettings,
  Service,
  Survey,
  SurveyStats,
  SurveyFilterParams,
  ReportData,
  RatingValue,
  RatingScore,
  AdminUser,
} from '../types';
import { INITIAL_OFFICERS } from '../utils/officers';

const STORAGE_KEYS = {
  SETTINGS: 'ptun_client_settings',
  SERVICES: 'ptun_client_services',
  SURVEYS: 'ptun_client_surveys',
  ADMIN_USER: 'ptun_client_admin',
  TOKEN: 'ptun_survey_token',
};

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

export const DEFAULT_SERVICES: Service[] = [
  {
    id: 'srv-1',
    name: 'Pelayanan PTSP',
    description: 'Pelayanan Terpadu Satu Pintu',
    icon_name: 'Building2',
    order_index: 1,
    is_active: true,
    sub_services: [
      'Meja Informasi dan Meja Pengaduan',
      'Meja 3',
      'Meja Kasir',
      'Meja Penerimaan Surat',
      'Layanan E-Court',
    ],
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'srv-5',
    name: 'POSBAKUM',
    description: 'Pos Bantuan Hukum untuk masyarakat pencari keadilan',
    icon_name: 'Scale',
    order_index: 2,
    is_active: true,
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'srv-6',
    name: 'Layanan Lainnya',
    description: 'Persuratan, pengaduan, dan layanan umum lain',
    icon_name: 'Layers',
    order_index: 3,
    is_active: true,
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
];

const RATING_SCORES: Record<RatingValue, RatingScore> = {
  sangat_puas: 4,
  puas: 3,
  cukup: 2,
  tidak_puas: 1,
};

function safeJsonParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeJsonSet<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err: any) {
    console.error('LocalStorage write error:', err);
    // If quota exceeded, clean up old demo surveys to ensure critical settings can be stored
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      try {
        const rawSurveys = localStorage.getItem(STORAGE_KEYS.SURVEYS);
        if (rawSurveys) {
          const list = JSON.parse(rawSurveys);
          if (Array.isArray(list) && list.length > 30) {
            // Keep recent surveys only
            localStorage.setItem(STORAGE_KEYS.SURVEYS, JSON.stringify(list.slice(0, 30)));
            localStorage.setItem(key, JSON.stringify(val));
          }
        }
      } catch (pruneErr) {
        console.warn('Could not prune localStorage surveys:', pruneErr);
      }
    }
  }
}

export const clientStorage = {
  getSettings(): AppSettings {
    const stored = safeJsonParse<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (!stored.service_officers || stored.service_officers.length === 0) {
      stored.service_officers = INITIAL_OFFICERS;
      safeJsonSet(STORAGE_KEYS.SETTINGS, stored);
    }
    return stored;
  },

  hasCustomSettings(): boolean {
    const stored = safeJsonParse<AppSettings | null>(STORAGE_KEYS.SETTINGS, null);
    if (!stored) return false;
    return Boolean(stored.updated_at);
  },

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated: AppSettings = {
      ...current,
      ...partial,
      updated_at: partial.updated_at || new Date().toISOString(),
    };
    safeJsonSet(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  getServices(activeOnly = false): Service[] {
    const services = safeJsonParse<Service[]>(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES);
    if (activeOnly) {
      return services.filter((s) => s.is_active);
    }
    return services;
  },

  saveServices(services: Service[]): void {
    safeJsonSet(STORAGE_KEYS.SERVICES, services);
  },

  createService(data: {
    name: string;
    description?: string;
    icon_name?: string;
    sub_services?: string[];
  }): Service {
    const services = this.getServices(false);
    const newService: Service = {
      id: `srv-${Date.now()}`,
      name: data.name,
      description: data.description,
      icon_name: data.icon_name || 'Layers',
      sub_services: data.sub_services || [],
      is_active: true,
      order_index: services.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    services.push(newService);
    this.saveServices(services);
    return newService;
  },

  updateService(id: string, partial: Partial<Service>): Service | null {
    const services = this.getServices(false);
    const idx = services.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    services[idx] = {
      ...services[idx],
      ...partial,
      updated_at: new Date().toISOString(),
    };
    this.saveServices(services);
    return services[idx];
  },

  deleteService(id: string): boolean {
    const services = this.getServices(false);
    const filtered = services.filter((s) => s.id !== id);
    if (filtered.length === services.length) return false;
    this.saveServices(filtered);
    return true;
  },

  getSurveys(): Survey[] {
    return safeJsonParse<Survey[]>(STORAGE_KEYS.SURVEYS, []);
  },

  saveSurveys(surveys: Survey[]): void {
    safeJsonSet(STORAGE_KEYS.SURVEYS, surveys);
  },

  submitSurvey(params: {
    service_id: string;
    sub_service_name?: string;
    rating: RatingValue;
    feedback_choice: 'ada' | 'tidak_ada';
    feedback?: string;
  }): Survey {
    const services = this.getServices(false);
    const service = services.find((s) => s.id === params.service_id);
    const serviceName = service ? service.name : 'Pelayanan PTSP';

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const newSurvey: Survey = {
      id: `surv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: dateStr,
      time: timeStr,
      timestamp: now.getTime(),
      service_id: params.service_id,
      service_name: serviceName,
      sub_service_name: params.sub_service_name,
      rating: params.rating,
      rating_score: RATING_SCORES[params.rating],
      feedback: params.feedback || '',
      feedback_choice: params.feedback_choice,
      status: 'valid',
      is_demo: false,
      created_at: now.toISOString(),
    };

    const surveys = this.getSurveys();
    surveys.unshift(newSurvey);
    this.saveSurveys(surveys);
    return newSurvey;
  },

  deleteSurvey(id: string): boolean {
    const surveys = this.getSurveys();
    const filtered = surveys.filter((s) => s.id !== id);
    if (filtered.length === surveys.length) return false;
    this.saveSurveys(filtered);
    return true;
  },

  seedDemoSurveys(count = 25): number {
    const services = this.getServices(true);
    if (services.length === 0) return 0;

    const sampleFeedbacks = [
      'Pelayanan sangat cepat, ramah, dan informatif.',
      'Petugas sangat responsif menjelaskan proses e-court.',
      'Sangat terbantu dalam proses administrasi perkara.',
      'Ruang PTSP nyaman dan petugas melayani dengan senyum.',
      'Penjelasan petugas sangat jelas dan transparan.',
      'Bagus dan sigap, terima kasih PTUN Pangkalpinang.',
      'Pelayanan baik, mohon dipertahankan.',
      'Cukup baik dan tertib.',
    ];

    const ratings: RatingValue[] = ['sangat_puas', 'sangat_puas', 'puas', 'puas', 'cukup'];
    const surveys = this.getSurveys();
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * 20);
      const surveyTime = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 8 * 60 * 60 * 1000);
      const service = services[Math.floor(Math.random() * services.length)];
      const rating = ratings[Math.floor(Math.random() * ratings.length)];
      const hasFeedback = Math.random() > 0.5;
      const feedback = hasFeedback ? sampleFeedbacks[Math.floor(Math.random() * sampleFeedbacks.length)] : '';
      const subService =
        service.sub_services && service.sub_services.length > 0
          ? service.sub_services[Math.floor(Math.random() * service.sub_services.length)]
          : undefined;

      surveys.push({
        id: `demo-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        date: surveyTime.toISOString().split('T')[0],
        time: surveyTime.toTimeString().split(' ')[0],
        timestamp: surveyTime.getTime(),
        service_id: service.id,
        service_name: service.name,
        sub_service_name: subService,
        rating,
        rating_score: RATING_SCORES[rating],
        feedback,
        feedback_choice: hasFeedback ? 'ada' : 'tidak_ada',
        status: 'valid',
        is_demo: true,
        created_at: surveyTime.toISOString(),
      });
    }

    surveys.sort((a, b) => b.timestamp - a.timestamp);
    this.saveSurveys(surveys);
    return count;
  },

  clearDemoSurveys(): number {
    const surveys = this.getSurveys();
    const filtered = surveys.filter((s) => !s.is_demo);
    const removed = surveys.length - filtered.length;
    this.saveSurveys(filtered);
    return removed;
  },

  clearAllSurveys(): number {
    const surveys = this.getSurveys();
    const count = surveys.length;
    this.saveSurveys([]);
    return count;
  },

  getStats(period = 'all', serviceId = 'all'): SurveyStats {
    let surveys = this.getSurveys().filter((s) => s.status === 'valid');

    if (serviceId !== 'all') {
      surveys = surveys.filter((s) => s.service_id === serviceId);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    if (period === 'today') {
      surveys = surveys.filter((s) => s.date === todayStr);
    } else if (period === 'this_week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      surveys = surveys.filter((s) => s.date >= oneWeekAgo);
    } else if (period === 'this_month') {
      const monthPrefix = todayStr.substring(0, 7);
      surveys = surveys.filter((s) => s.date.startsWith(monthPrefix));
    } else if (period === 'this_year') {
      const yearPrefix = todayStr.substring(0, 4);
      surveys = surveys.filter((s) => s.date.startsWith(yearPrefix));
    }

    const total = surveys.length;
    const todayCount = this.getSurveys().filter((s) => s.date === todayStr).length;

    const distribution = {
      sangat_puas: 0,
      puas: 0,
      cukup: 0,
      tidak_puas: 0,
    };

    let totalScore = 0;
    surveys.forEach((s) => {
      distribution[s.rating] = (distribution[s.rating] || 0) + 1;
      totalScore += s.rating_score;
    });

    const averageScore = total > 0 ? parseFloat((totalScore / total).toFixed(2)) : 0;
    const satisfiedCount = distribution.sangat_puas + distribution.puas;
    const satisfactionRate = total > 0 ? parseFloat(((satisfiedCount / total) * 100).toFixed(1)) : 0;

    // IKM Score (scale 0-100, Permenpan RB standard conversion)
    const ikmScore = parseFloat((averageScore * 25).toFixed(1));
    let ikmGrade = 'Sangat Baik (A)';
    if (ikmScore < 64.99) ikmGrade = 'Tidak Baik (D)';
    else if (ikmScore < 76.6) ikmGrade = 'Kurang Baik (C)';
    else if (ikmScore < 88.3) ikmGrade = 'Baik (B)';

    // Group by date for trend
    const dateMap = new Map<string, { total: number; sp: number; p: number; c: number; tp: number; score: number }>();
    surveys.forEach((s) => {
      const cur = dateMap.get(s.date) || { total: 0, sp: 0, p: 0, c: 0, tp: 0, score: 0 };
      cur.total += 1;
      if (s.rating === 'sangat_puas') cur.sp += 1;
      if (s.rating === 'puas') cur.p += 1;
      if (s.rating === 'cukup') cur.c += 1;
      if (s.rating === 'tidak_puas') cur.tp += 1;
      cur.score += s.rating_score;
      dateMap.set(s.date, cur);
    });

    const trend = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, d]) => {
        const parts = date.split('-');
        return {
          date,
          formatted_date: `${parts[2]}/${parts[1]}`,
          total: d.total,
          sangat_puas: d.sp,
          puas: d.p,
          cukup: d.c,
          tidak_puas: d.tp,
          avg_score: parseFloat((d.score / d.total).toFixed(2)),
        };
      });

    // Breakdown by service
    const serviceMap = new Map<string, { name: string; total: number; sp: number; p: number; c: number; tp: number; score: number }>();
    surveys.forEach((s) => {
      const cur = serviceMap.get(s.service_id) || {
        name: s.service_name,
        total: 0,
        sp: 0,
        p: 0,
        c: 0,
        tp: 0,
        score: 0,
      };
      cur.total += 1;
      if (s.rating === 'sangat_puas') cur.sp += 1;
      if (s.rating === 'puas') cur.p += 1;
      if (s.rating === 'cukup') cur.c += 1;
      if (s.rating === 'tidak_puas') cur.tp += 1;
      cur.score += s.rating_score;
      serviceMap.set(s.service_id, cur);
    });

    const serviceBreakdown = Array.from(serviceMap.entries()).map(([id, d]) => ({
      service_id: id,
      service_name: d.name,
      total: d.total,
      sangat_puas: d.sp,
      puas: d.p,
      cukup: d.c,
      tidak_puas: d.tp,
      avg_score: parseFloat((d.score / d.total).toFixed(2)),
      satisfaction_rate: parseFloat((((d.sp + d.p) / d.total) * 100).toFixed(1)),
    }));

    return {
      total_respondents: total,
      today_respondents: todayCount,
      average_score: averageScore,
      satisfaction_rate: satisfactionRate,
      ikm_score: ikmScore,
      ikm_grade: ikmGrade,
      distribution,
      trend,
      service_breakdown: serviceBreakdown,
    };
  },

  getSurveysList(params: SurveyFilterParams) {
    let surveys = this.getSurveys();

    if (params.search) {
      const q = params.search.toLowerCase();
      surveys = surveys.filter(
        (s) =>
          s.service_name.toLowerCase().includes(q) ||
          (s.sub_service_name && s.sub_service_name.toLowerCase().includes(q)) ||
          s.feedback.toLowerCase().includes(q),
      );
    }

    if (params.start_date) {
      surveys = surveys.filter((s) => s.date >= params.start_date!);
    }
    if (params.end_date) {
      surveys = surveys.filter((s) => s.date <= params.end_date!);
    }
    if (params.service_id && params.service_id !== 'all') {
      surveys = surveys.filter((s) => s.service_id === params.service_id);
    }
    if (params.rating && params.rating !== 'all') {
      surveys = surveys.filter((s) => s.rating === params.rating);
    }

    // Sort
    const sortBy = params.sort_by || 'created_at';
    const sortOrder = params.sort_order || 'desc';

    surveys.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'rating_score') cmp = a.rating_score - b.rating_score;
      else if (sortBy === 'service_name') cmp = a.service_name.localeCompare(b.service_name);
      else cmp = a.timestamp - b.timestamp;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = surveys.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paginated = surveys.slice(start, start + limit);

    return {
      surveys: paginated,
      total,
      page,
      limit,
      total_pages: totalPages,
    };
  },

  getReportData(startDate?: string, endDate?: string, serviceId?: string): ReportData {
    let surveys = this.getSurveys().filter((s) => s.status === 'valid');

    if (startDate) surveys = surveys.filter((s) => s.date >= startDate);
    if (endDate) surveys = surveys.filter((s) => s.date <= endDate);
    if (serviceId && serviceId !== 'all') surveys = surveys.filter((s) => s.service_id === serviceId);

    const total = surveys.length;
    const counts = { sangat_puas: 0, puas: 0, cukup: 0, tidak_puas: 0 };
    let totalScore = 0;

    surveys.forEach((s) => {
      counts[s.rating] = (counts[s.rating] || 0) + 1;
      totalScore += s.rating_score;
    });

    const percentages = {
      sangat_puas: total > 0 ? parseFloat(((counts.sangat_puas / total) * 100).toFixed(1)) : 0,
      puas: total > 0 ? parseFloat(((counts.puas / total) * 100).toFixed(1)) : 0,
      cukup: total > 0 ? parseFloat(((counts.cukup / total) * 100).toFixed(1)) : 0,
      tidak_puas: total > 0 ? parseFloat(((counts.tidak_puas / total) * 100).toFixed(1)) : 0,
    };

    const avgScore = total > 0 ? parseFloat((totalScore / total).toFixed(2)) : 0;
    const ikmScore = parseFloat((avgScore * 25).toFixed(1));
    let ikmGrade = 'Sangat Baik (A)';
    if (ikmScore < 64.99) ikmGrade = 'Tidak Baik (D)';
    else if (ikmScore < 76.6) ikmGrade = 'Kurang Baik (C)';
    else if (ikmScore < 88.3) ikmGrade = 'Baik (B)';

    // Service breakdown
    const sMap = new Map<string, { total: number; sp: number; p: number; c: number; tp: number; score: number }>();
    surveys.forEach((s) => {
      const cur = sMap.get(s.service_name) || { total: 0, sp: 0, p: 0, c: 0, tp: 0, score: 0 };
      cur.total++;
      if (s.rating === 'sangat_puas') cur.sp++;
      if (s.rating === 'puas') cur.p++;
      if (s.rating === 'cukup') cur.c++;
      if (s.rating === 'tidak_puas') cur.tp++;
      cur.score += s.rating_score;
      sMap.set(s.service_name, cur);
    });

    const serviceBreakdown = Array.from(sMap.entries()).map(([name, d]) => ({
      service_name: name,
      total: d.total,
      percentages: {
        sangat_puas: parseFloat(((d.sp / d.total) * 100).toFixed(1)),
        puas: parseFloat(((d.p / d.total) * 100).toFixed(1)),
        cukup: parseFloat(((d.c / d.total) * 100).toFixed(1)),
        tidak_puas: parseFloat(((d.tp / d.total) * 100).toFixed(1)),
      },
      avg_score: parseFloat((d.score / d.total).toFixed(2)),
    }));

    return {
      period_label: startDate && endDate ? `${startDate} s/d ${endDate}` : 'Semua Periode',
      start_date: startDate || '',
      end_date: endDate || '',
      service_name: serviceId && serviceId !== 'all' ? serviceId : 'Semua Layanan',
      generated_at: new Date().toLocaleString('id-ID'),
      total_respondents: total,
      counts,
      percentages,
      average_score: avgScore,
      ikm_score: ikmScore,
      ikm_grade: ikmGrade,
      service_breakdown: serviceBreakdown,
    };
  },

  exportCSV(startDate?: string, endDate?: string, serviceId?: string): Blob {
    let surveys = this.getSurveys();
    if (startDate) surveys = surveys.filter((s) => s.date >= startDate);
    if (endDate) surveys = surveys.filter((s) => s.date <= endDate);
    if (serviceId && serviceId !== 'all') surveys = surveys.filter((s) => s.service_id === serviceId);

    const ratingLabels: Record<string, string> = {
      sangat_puas: 'Sangat Puas',
      puas: 'Puas',
      cukup: 'Cukup',
      tidak_puas: 'Tidak Puas',
    };

    const headers = ['No', 'Tanggal', 'Waktu', 'Jenis Layanan', 'Sub-Layanan', 'Penilaian', 'Skor', 'Saran'];
    const rows = surveys.map((s, index) => {
      const cleanFeedback = (s.feedback || '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
      const cleanServiceName = s.service_name.replace(/"/g, '""');
      const cleanSub = (s.sub_service_name || '-').replace(/"/g, '""');
      const ratingLabel = ratingLabels[s.rating] || s.rating;
      return [
        index + 1,
        `"${s.date}"`,
        `"${s.time}"`,
        `"${cleanServiceName}"`,
        `"${cleanSub}"`,
        `"${ratingLabel}"`,
        s.rating_score,
        `"${cleanFeedback}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    return new Blob([csvContent], { type: 'text/csv; charset=utf-8' });
  },

  login(username: string, password: string): { token: string; user: AdminUser } {
    // Default admin: admin / admin123
    const customCreds = safeJsonParse<{ username: string; password: string }>(STORAGE_KEYS.ADMIN_USER, {
      username: 'admin',
      password: 'admin123',
    });

    if (username.trim() === customCreds.username && password.trim() === customCreds.password) {
      const token = `client-token-${Date.now()}`;
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      const user: AdminUser = {
        id: 'admin-1',
        username: customCreds.username,
        full_name: 'Administrator PTSP',
        role: 'superadmin',
      };
      return { token, user };
    }

    throw new Error('Username atau password tidak sesuai.');
  },

  changePassword(currentPassword: string, newPassword: string): void {
    const customCreds = safeJsonParse<{ username: string; password: string }>(STORAGE_KEYS.ADMIN_USER, {
      username: 'admin',
      password: 'admin123',
    });

    if (currentPassword !== customCreds.password) {
      throw new Error('Password saat ini tidak cocok.');
    }
    if (newPassword.length < 6) {
      throw new Error('Password baru minimal 6 karakter.');
    }

    customCreds.password = newPassword;
    safeJsonSet(STORAGE_KEYS.ADMIN_USER, customCreds);
  },

  getProfile(): AdminUser {
    const customCreds = safeJsonParse<{ username: string; password: string }>(STORAGE_KEYS.ADMIN_USER, {
      username: 'admin',
      password: 'admin123',
    });
    return {
      id: 'admin-1',
      username: customCreds.username,
      full_name: 'Administrator PTSP',
      role: 'superadmin',
    };
  },
};
