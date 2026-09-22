import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  Survey,
  Service,
  AppSettings,
  RatingValue,
  RatingScore,
  SurveyStats,
  ReportData,
} from '../src/types';

export interface UserRecord {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: 'superadmin' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface DatabaseSchema {
  version: number;
  users: UserRecord[];
  services: Service[];
  surveys: Survey[];
  settings: AppSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'ptun_survey_database.json');

const DEFAULT_CANVA_LOGO =
  'https://media.canva.com/v2/download/name:LOGO+PTUN+PKP+TERBARU.png/uri:ifs%3A%2F%2FM%2F1bf733e1abd446f9aed2b2ccfdec0e1e?csig=AAAAAAAAAAAAAAAAAAAAAHYjLjd8PZ86bTrKEkscibX4WCN_E_TmfdqZ2phiQ8iO&exp=1790049450&signer=media-rpc&token=AAIAAU0AIDFiZjczM2UxYWJkNDQ2ZjlhZWQyYjJjY2ZkZWMwZTFlAAAAAAGgx-fDzHYn7PAwbx-Ilh5iISgbZQRGeWSkvs2NRmgt2FeKXhlr';

const INITIAL_SERVICES: Omit<Service, 'created_at' | 'updated_at'>[] = [
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
  },
  {
    id: 'srv-5',
    name: 'POSBAKUM',
    description: 'Pos Bantuan Hukum untuk masyarakat pencari keadilan',
    icon_name: 'Scale',
    order_index: 2,
    is_active: true,
  },
  {
    id: 'srv-6',
    name: 'Layanan Lainnya',
    description: 'Persuratan, pengaduan, dan layanan umum lain',
    icon_name: 'Layers',
    order_index: 3,
    is_active: true,
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  agency_name: 'PTUN Pangkalpinang',
  app_name: 'Sistem Survei Kepuasan Pelayanan',
  logo_url: DEFAULT_CANVA_LOGO,
  survey_title: 'SURVEI KEPUASAN PELAYANAN PETUGAS PTSP\nPTUN PANGKALPINANG',
  survey_subtitle: 'Berikan penilaian Anda terhadap pelayanan yang telah diterima.',
  success_message: 'Masukan Anda sangat membantu kami dalam meningkatkan kualitas pelayanan.',
  redirect_delay_seconds: 5,
  primary_color: '#1e3a8a',
  footer_text: 'Copyright © 2026 PTUN Pangkalpinang. All Rights Reserved.',
};

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadDatabase();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    const nowIso = new Date().toISOString();

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        if (parsed.users && parsed.services && parsed.surveys && parsed.settings) {
          // Migration: remove deleted standalone services ('Meja Informasi', 'Pendaftaran Perkara', 'Pelayanan E-Court')
          const removeIds = ['srv-2', 'srv-3', 'srv-4'];
          const hasOld = parsed.services.some((s) => removeIds.includes(s.id));
          if (hasOld) {
            parsed.services = parsed.services.filter((s) => !removeIds.includes(s.id));
            parsed.services.forEach((s, idx) => {
              s.order_index = idx + 1;
            });
          }
          // Ensure Pelayanan PTSP has sub_services
          const ptsp = parsed.services.find((s) => s.id === 'srv-1' || s.name.toLowerCase().includes('ptsp'));
          if (ptsp && (!ptsp.sub_services || ptsp.sub_services.length === 0)) {
            ptsp.sub_services = [
              'Meja Informasi dan Meja Pengaduan',
              'Meja 3',
              'Meja Kasir',
              'Meja Penerimaan Surat',
              'Layanan E-Court',
            ];
          }
          if (hasOld) {
            this.saveDataDirect(parsed);
          }
          return parsed;
        }
      } catch (err) {
        console.error('Error reading database file, creating fresh backup and initial state', err);
        const backupFile = path.join(DATA_DIR, `ptun_survey_backup_${Date.now()}.json`);
        try {
          fs.copyFileSync(DB_FILE, backupFile);
        } catch {
          // ignore
        }
      }
    }

    // Initialize fresh database
    const initialUsers: UserRecord[] = [
      {
        id: 'usr-admin-1',
        username: 'admin',
        password_hash: bcrypt.hashSync('adminptun', 10),
        full_name: 'Administrator PTSP',
        role: 'superadmin',
        created_at: nowIso,
        updated_at: nowIso,
      },
    ];

    const initialServices: Service[] = INITIAL_SERVICES.map((s) => ({
      ...s,
      created_at: nowIso,
      updated_at: nowIso,
    }));

    const initialDb: DatabaseSchema = {
      version: 1,
      users: initialUsers,
      services: initialServices,
      surveys: [],
      settings: DEFAULT_SETTINGS,
    };

    this.saveDataDirect(initialDb);
    return initialDb;
  }

  private saveDataDirect(data: DatabaseSchema) {
    this.ensureDirectory();
    const tempFile = path.join(DATA_DIR, `temp_${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  private persist() {
    this.saveDataDirect(this.data);
  }

  // --- Users ---
  public getUserByUsername(username: string): UserRecord | undefined {
    return this.data.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  }

  public getUserById(id: string): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public updatePassword(userId: string, newHash: string): boolean {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return false;
    user.password_hash = newHash;
    user.updated_at = new Date().toISOString();
    this.persist();
    return true;
  }

  // --- Services ---
  public getServices(onlyActive = false): Service[] {
    const list = this.data.services.sort((a, b) => a.order_index - b.order_index);
    if (onlyActive) {
      return list.filter((s) => s.is_active);
    }
    return list;
  }

  public getServiceById(id: string): Service | undefined {
    return this.data.services.find((s) => s.id === id);
  }

  public createService(data: {
    name: string;
    description?: string;
    icon_name?: string;
    sub_services?: string[];
  }): Service {
    const now = new Date().toISOString();
    const maxOrder = this.data.services.reduce((max, s) => Math.max(max, s.order_index), 0);
    const newService: Service = {
      id: 'srv-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: data.name.trim(),
      description: data.description?.trim() || '',
      icon_name: data.icon_name || 'Layers',
      order_index: maxOrder + 1,
      is_active: true,
      sub_services: data.sub_services && Array.isArray(data.sub_services) ? data.sub_services : undefined,
      created_at: now,
      updated_at: now,
    };
    this.data.services.push(newService);
    this.persist();
    return newService;
  }

  public updateService(
    id: string,
    updates: Partial<Pick<Service, 'name' | 'description' | 'icon_name' | 'order_index' | 'is_active' | 'sub_services'>>,
  ): Service | null {
    const service = this.data.services.find((s) => s.id === id);
    if (!service) return null;
    if (updates.name !== undefined) service.name = updates.name.trim();
    if (updates.description !== undefined) service.description = updates.description.trim();
    if (updates.icon_name !== undefined) service.icon_name = updates.icon_name;
    if (updates.order_index !== undefined) service.order_index = updates.order_index;
    if (updates.is_active !== undefined) service.is_active = updates.is_active;
    if (updates.sub_services !== undefined) service.sub_services = updates.sub_services;
    service.updated_at = new Date().toISOString();
    this.persist();
    return service;
  }

  public deleteService(id: string): boolean {
    const index = this.data.services.findIndex((s) => s.id === id);
    if (index === -1) return false;
    this.data.services.splice(index, 1);
    this.persist();
    return true;
  }

  // --- Settings ---
  public getSettings(): AppSettings {
    return { ...this.data.settings };
  }

  public updateSettings(updates: Partial<AppSettings>): AppSettings {
    this.data.settings = {
      ...this.data.settings,
      ...updates,
      updated_at: updates.updated_at || new Date().toISOString(),
    };
    this.persist();
    return this.getSettings();
  }

  // --- Surveys ---
  public createSurvey(params: {
    service_id: string;
    sub_service_name?: string;
    rating: RatingValue;
    feedback_choice: 'ada' | 'tidak_ada';
    feedback?: string;
    is_demo?: boolean;
    custom_timestamp?: number;
  }): Survey {
    const ratingScores: Record<RatingValue, RatingScore> = {
      sangat_puas: 4,
      puas: 3,
      cukup: 2,
      tidak_puas: 1,
    };

    const targetService = this.getServiceById(params.service_id);
    let serviceName = targetService ? targetService.name : 'Pelayanan PTSP';
    if (params.sub_service_name && params.sub_service_name.trim()) {
      serviceName = `${serviceName} - ${params.sub_service_name.trim()}`;
    }

    const now = params.custom_timestamp ? new Date(params.custom_timestamp) : new Date();
    // Format WIB or server time (YYYY-MM-DD and HH:mm:ss)
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hours}:${minutes}:${seconds}`;

    const newSurvey: Survey = {
      id: 'svy-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      date: dateStr,
      time: timeStr,
      timestamp: now.getTime(),
      service_id: params.service_id,
      service_name: serviceName,
      sub_service_name: params.sub_service_name?.trim() || undefined,
      rating: params.rating,
      rating_score: ratingScores[params.rating],
      feedback: params.feedback?.trim() || '',
      feedback_choice: params.feedback_choice,
      status: 'valid',
      is_demo: !!params.is_demo,
      created_at: now.toISOString(),
    };

    this.data.surveys.unshift(newSurvey);
    this.persist();
    return newSurvey;
  }

  public getSurveys(filters: {
    search?: string;
    start_date?: string;
    end_date?: string;
    service_id?: string;
    rating?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    exclude_demo?: boolean;
  }) {
    let list = [...this.data.surveys];

    if (filters.exclude_demo) {
      list = list.filter((s) => !s.is_demo);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.service_name.toLowerCase().includes(q) ||
          (s.sub_service_name && s.sub_service_name.toLowerCase().includes(q)) ||
          s.feedback.toLowerCase().includes(q) ||
          s.rating.toLowerCase().includes(q) ||
          s.date.includes(q),
      );
    }

    if (filters.start_date) {
      list = list.filter((s) => s.date >= filters.start_date!);
    }

    if (filters.end_date) {
      list = list.filter((s) => s.date <= filters.end_date!);
    }

    if (filters.service_id && filters.service_id !== 'all') {
      list = list.filter((s) => s.service_id === filters.service_id);
    }

    if (filters.rating && filters.rating !== 'all') {
      list = list.filter((s) => s.rating === filters.rating);
    }

    // Sorting
    const sortField = filters.sort_by || 'timestamp';
    const isAsc = filters.sort_order === 'asc';

    list.sort((a, b) => {
      let valA: any = (a as any)[sortField];
      let valB: any = (b as any)[sortField];
      if (typeof valA === 'string') {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return isAsc ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    });

    const total = list.length;
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 10);
    const startIndex = (page - 1) * limit;
    const paginatedSurveys = list.slice(startIndex, startIndex + limit);

    return {
      surveys: paginatedSurveys,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  public getSurveyById(id: string): Survey | undefined {
    return this.data.surveys.find((s) => s.id === id);
  }

  public deleteSurvey(id: string): boolean {
    const idx = this.data.surveys.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.data.surveys.splice(idx, 1);
    this.persist();
    return true;
  }

  public clearDemoSurveys(): number {
    const initialCount = this.data.surveys.length;
    this.data.surveys = this.data.surveys.filter((s) => !s.is_demo);
    const removed = initialCount - this.data.surveys.length;
    this.persist();
    return removed;
  }

  public clearAllSurveys(): number {
    const count = this.data.surveys.length;
    this.data.surveys = [];
    this.persist();
    return count;
  }

  public seedDemoSurveys(count = 30) {
    const services = this.getServices();
    if (services.length === 0) return 0;

    const sampleFeedbacks = [
      'Pelayanan sangat cepat, ramah, dan informatif.',
      'Petugas PTSP sigap membantu proses verifikasi gugatan.',
      'Antrian tertib dan ruangan ber-AC nyaman.',
      'Informasi persyaratan perkara sangat jelas.',
      'Panduan e-court sangat membantu kami yang baru pertama kali.',
      'Petugas Posbakum sangat sabar membimbing penyusunan berkas.',
      'Petugas meja informasi menjawab dengan sangat sopan dan jelas.',
      'Pelayanan sudah bagus, mohon pertahankan.',
      'Waktu tunggu sedikit agak lama karena jam istirahat, tapi tetap terlayani dengan baik.',
      'Sangat puas dengan keterbukaan informasi peradilan di PTUN Pangkalpinang.',
    ];

    const ratingsWeighted: RatingValue[] = [
      'sangat_puas',
      'sangat_puas',
      'sangat_puas',
      'sangat_puas',
      'puas',
      'puas',
      'puas',
      'cukup',
      'sangat_puas',
      'puas',
      'tidak_puas',
    ];

    const now = Date.now();
    for (let i = 0; i < count; i++) {
      // distribute across past 14 days
      const daysAgo = Math.floor(Math.random() * 14);
      const hoursOffset = Math.floor(Math.random() * 8) + 8; // 08:00 - 16:00
      const minutesOffset = Math.floor(Math.random() * 60);

      const d = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      d.setHours(hoursOffset, minutesOffset, 0, 0);

      const randomService = services[Math.floor(Math.random() * services.length)];
      const randomRating = ratingsWeighted[Math.floor(Math.random() * ratingsWeighted.length)];
      const hasFeedback = Math.random() > 0.4;
      const feedback = hasFeedback
        ? sampleFeedbacks[Math.floor(Math.random() * sampleFeedbacks.length)]
        : '';

      this.createSurvey({
        service_id: randomService.id,
        rating: randomRating,
        feedback_choice: hasFeedback ? 'ada' : 'tidak_ada',
        feedback,
        is_demo: true,
        custom_timestamp: d.getTime(),
      });
    }

    return count;
  }

  // --- Statistics ---
  public getStats(period = 'all', serviceId = 'all'): SurveyStats {
    let list = [...this.data.surveys];

    if (serviceId !== 'all') {
      list = list.filter((s) => s.service_id === serviceId);
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // Period filter for trends
    let startDateLimit: string | null = null;
    if (period === 'today') {
      startDateLimit = todayStr;
    } else if (period === '7days') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDateLimit = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } else if (period === 'this_month') {
      startDateLimit = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    } else if (period === '3months') {
      const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      startDateLimit = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } else if (period === 'this_year') {
      startDateLimit = `${now.getFullYear()}-01-01`;
    }

    const filteredSurveys = startDateLimit ? list.filter((s) => s.date >= startDateLimit!) : list;

    const totalRespondents = filteredSurveys.length;
    const todayRespondents = list.filter((s) => s.date === todayStr).length;

    const distribution = {
      sangat_puas: 0,
      puas: 0,
      cukup: 0,
      tidak_puas: 0,
    };

    let totalScore = 0;
    filteredSurveys.forEach((s) => {
      distribution[s.rating] = (distribution[s.rating] || 0) + 1;
      totalScore += s.rating_score;
    });

    const averageScore = totalRespondents > 0 ? Number((totalScore / totalRespondents).toFixed(2)) : 0;
    const satisfiedCount = distribution.sangat_puas + distribution.puas;
    const satisfactionRate =
      totalRespondents > 0 ? Number(((satisfiedCount / totalRespondents) * 100).toFixed(1)) : 0;

    // MenPAN-RB IKM Index Conversion (average score / 4 * 100)
    const ikmScore = Number((averageScore * 25).toFixed(2));
    let ikmGrade = 'Belum Ada Data';
    if (totalRespondents > 0) {
      if (ikmScore >= 88.31) ikmGrade = 'A (Sangat Baik)';
      else if (ikmScore >= 76.61) ikmGrade = 'B (Baik)';
      else if (ikmScore >= 65.0) ikmGrade = 'C (Kurang Baik)';
      else ikmGrade = 'D (Tidak Baik)';
    }

    // Trend by date (sorted chronological)
    const trendMap = new Map<string, { total: number; sp: number; p: number; c: number; tp: number; scoreSum: number }>();
    filteredSurveys.forEach((s) => {
      const existing = trendMap.get(s.date) || { total: 0, sp: 0, p: 0, c: 0, tp: 0, scoreSum: 0 };
      existing.total += 1;
      if (s.rating === 'sangat_puas') existing.sp += 1;
      if (s.rating === 'puas') existing.p += 1;
      if (s.rating === 'cukup') existing.c += 1;
      if (s.rating === 'tidak_puas') existing.tp += 1;
      existing.scoreSum += s.rating_score;
      trendMap.set(s.date, existing);
    });

    const sortedDates = Array.from(trendMap.keys()).sort();
    const trend = sortedDates.map((dateStr) => {
      const item = trendMap.get(dateStr)!;
      const parts = dateStr.split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
      return {
        date: dateStr,
        formatted_date: formattedDate,
        total: item.total,
        sangat_puas: item.sp,
        puas: item.p,
        cukup: item.c,
        tidak_puas: item.tp,
        avg_score: Number((item.scoreSum / item.total).toFixed(2)),
      };
    });

    // Breakdown per service
    const serviceMap = new Map<string, { name: string; total: number; sp: number; p: number; c: number; tp: number; scoreSum: number }>();
    filteredSurveys.forEach((s) => {
      const existing = serviceMap.get(s.service_id) || {
        name: s.service_name,
        total: 0,
        sp: 0,
        p: 0,
        c: 0,
        tp: 0,
        scoreSum: 0,
      };
      existing.total += 1;
      if (s.rating === 'sangat_puas') existing.sp += 1;
      if (s.rating === 'puas') existing.p += 1;
      if (s.rating === 'cukup') existing.c += 1;
      if (s.rating === 'tidak_puas') existing.tp += 1;
      existing.scoreSum += s.rating_score;
      serviceMap.set(s.service_id, existing);
    });

    const serviceBreakdown = Array.from(serviceMap.entries()).map(([serviceId, item]) => {
      const satCount = item.sp + item.p;
      return {
        service_id: serviceId,
        service_name: item.name,
        total: item.total,
        sangat_puas: item.sp,
        puas: item.p,
        cukup: item.c,
        tidak_puas: item.tp,
        avg_score: Number((item.scoreSum / item.total).toFixed(2)),
        satisfaction_rate: Number(((satCount / item.total) * 100).toFixed(1)),
      };
    });

    return {
      total_respondents: totalRespondents,
      today_respondents: todayRespondents,
      average_score: averageScore,
      satisfaction_rate: satisfactionRate,
      ikm_score: ikmScore,
      ikm_grade: ikmGrade,
      distribution,
      trend,
      service_breakdown: serviceBreakdown,
    };
  }

  // --- Official Report Data ---
  public getReport(startDate?: string, endDate?: string, serviceId = 'all'): ReportData {
    let list = [...this.data.surveys];

    if (startDate) list = list.filter((s) => s.date >= startDate);
    if (endDate) list = list.filter((s) => s.date <= endDate);
    if (serviceId !== 'all') list = list.filter((s) => s.service_id === serviceId);

    const total = list.length;
    const counts = {
      sangat_puas: 0,
      puas: 0,
      cukup: 0,
      tidak_puas: 0,
    };

    let totalScore = 0;
    list.forEach((s) => {
      counts[s.rating] = (counts[s.rating] || 0) + 1;
      totalScore += s.rating_score;
    });

    const calcPct = (c: number) => (total > 0 ? Number(((c / total) * 100).toFixed(1)) : 0);
    const percentages = {
      sangat_puas: calcPct(counts.sangat_puas),
      puas: calcPct(counts.puas),
      cukup: calcPct(counts.cukup),
      tidak_puas: calcPct(counts.tidak_puas),
    };

    const avgScore = total > 0 ? Number((totalScore / total).toFixed(2)) : 0;
    const ikm = Number((avgScore * 25).toFixed(2));
    let grade = 'Belum Ada Data';
    if (total > 0) {
      if (ikm >= 88.31) grade = 'A (Sangat Baik)';
      else if (ikm >= 76.61) grade = 'B (Baik)';
      else if (ikm >= 65.0) grade = 'C (Kurang Baik)';
      else grade = 'D (Tidak Baik)';
    }

    const targetService = serviceId !== 'all' ? this.getServiceById(serviceId) : null;
    const serviceName = targetService ? targetService.name : 'Seluruh Pelayanan PTSP';

    const periodLabel =
      startDate && endDate
        ? `${startDate} s/d ${endDate}`
        : startDate
        ? `Sejak ${startDate}`
        : endDate
        ? `Hingga ${endDate}`
        : 'Semua Periode';

    // Breakdown per service
    const sMap = new Map<string, { total: number; sp: number; p: number; c: number; tp: number; scoreSum: number }>();
    list.forEach((s) => {
      const e = sMap.get(s.service_name) || { total: 0, sp: 0, p: 0, c: 0, tp: 0, scoreSum: 0 };
      e.total += 1;
      if (s.rating === 'sangat_puas') e.sp += 1;
      if (s.rating === 'puas') e.p += 1;
      if (s.rating === 'cukup') e.c += 1;
      if (s.rating === 'tidak_puas') e.tp += 1;
      e.scoreSum += s.rating_score;
      sMap.set(s.service_name, e);
    });

    const serviceBreakdown = Array.from(sMap.entries()).map(([name, item]) => {
      const itemTotal = item.total;
      return {
        service_name: name,
        total: itemTotal,
        percentages: {
          sangat_puas: Number(((item.sp / itemTotal) * 100).toFixed(1)),
          puas: Number(((item.p / itemTotal) * 100).toFixed(1)),
          cukup: Number(((item.c / itemTotal) * 100).toFixed(1)),
          tidak_puas: Number(((item.tp / itemTotal) * 100).toFixed(1)),
        },
        avg_score: Number((item.scoreSum / itemTotal).toFixed(2)),
      };
    });

    const now = new Date();
    return {
      period_label: periodLabel,
      start_date: startDate || '',
      end_date: endDate || '',
      service_name: serviceName,
      generated_at: now.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }),
      total_respondents: total,
      counts,
      percentages,
      average_score: avgScore,
      ikm_score: ikm,
      ikm_grade: grade,
      service_breakdown: serviceBreakdown,
    };
  }
}

export const db = new Database();
