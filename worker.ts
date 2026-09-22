import bcrypt from 'bcryptjs';
import {
  Survey,
  Service,
  AppSettings,
  RatingValue,
  RatingScore,
  SurveyStats,
  ReportData,
} from './src/types';
import { INITIAL_OFFICERS } from './src/utils/officers';

export interface Env {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  SURVEY_KV?: any;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
}

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
  service_officers: INITIAL_OFFICERS,
};

const RATING_SCORE_MAP: Record<RatingValue, RatingScore> = {
  sangat_puas: 4,
  puas: 3,
  cukup: 2,
  tidak_puas: 1,
};

// Global in-memory cache for Worker isolates
let inMemoryData: DatabaseSchema | null = null;

function getInitialData(env?: Env): DatabaseSchema {
  const nowIso = new Date().toISOString();
  const adminPassword = env?.ADMIN_PASSWORD || 'adminptun';
  const adminUsername = env?.ADMIN_USERNAME || 'admin';

  return {
    version: 1,
    users: [
      {
        id: 'usr-admin-1',
        username: adminUsername,
        password_hash: bcrypt.hashSync(adminPassword, 10),
        full_name: 'Administrator PTSP',
        role: 'superadmin',
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    services: INITIAL_SERVICES.map((s) => ({
      ...s,
      created_at: nowIso,
      updated_at: nowIso,
    })),
    surveys: [],
    settings: DEFAULT_SETTINGS,
  };
}

async function loadData(env: Env): Promise<DatabaseSchema> {
  if (inMemoryData) return inMemoryData;

  if (env.SURVEY_KV) {
    try {
      const raw = await env.SURVEY_KV.get('ptun_database_json');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.services && parsed.settings) {
          inMemoryData = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to read from SURVEY_KV:', e);
    }
  }

  inMemoryData = getInitialData(env);
  return inMemoryData;
}

async function saveData(data: DatabaseSchema, env: Env): Promise<void> {
  inMemoryData = data;
  if (env.SURVEY_KV) {
    try {
      await env.SURVEY_KV.put('ptun_database_json', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to write to SURVEY_KV:', e);
    }
  }
}

// In-memory sessions
interface SessionInfo {
  userId: string;
  username: string;
  role: string;
  expiresAt: number;
}
const sessions = new Map<string, SessionInfo>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function jsonResponse(data: any, status = 200, customHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...customHeaders,
    },
  });
}

function verifyAuth(request: Request): SessionInfo | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const session = sessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    if (session) sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only process /api/ routes in worker logic
    if (!url.pathname.startsWith('/api/')) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return new Response('Not Found', { status: 404 });
    }

    const path = url.pathname;
    const dbData = await loadData(env);

    // 1. Health check
    if (path === '/api/health' && method === 'GET') {
      return jsonResponse({ status: 'ok', name: 'PTUN Pangkalpinang Survey API (Cloudflare Workers)' });
    }

    // 2. Public config
    if (path === '/api/public/config' && method === 'GET') {
      const activeServices = dbData.services
        .filter((s) => s.is_active)
        .sort((a, b) => a.order_index - b.order_index);
      return jsonResponse({
        settings: dbData.settings,
        services: activeServices,
      });
    }

    // 3. Public survey submission
    if (path === '/api/public/survey' && method === 'POST') {
      try {
        const body: any = await request.json();
        const { service_id, sub_service_name, rating, feedback_choice, feedback } = body;

        if (!service_id || !rating) {
          return jsonResponse(
            { error: 'Silakan pilih jenis layanan dan berikan penilaian terlebih dahulu.' },
            400
          );
        }

        const validRatings: RatingValue[] = ['sangat_puas', 'puas', 'cukup', 'tidak_puas'];
        if (!validRatings.includes(rating)) {
          return jsonResponse({ error: 'Nilai rating tidak valid.' }, 400);
        }

        const service = dbData.services.find((s) => s.id === service_id);
        const serviceName = service ? service.name : 'Pelayanan PTSP';

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = [
          String(now.getHours()).padStart(2, '0'),
          String(now.getMinutes()).padStart(2, '0'),
          String(now.getSeconds()).padStart(2, '0'),
        ].join(':');

        const newSurvey: Survey = {
          id: 'srv-rsp-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          service_id,
          service_name: serviceName,
          sub_service_name:
            typeof sub_service_name === 'string' && sub_service_name.trim()
              ? sub_service_name.trim()
              : undefined,
          rating,
          rating_score: RATING_SCORE_MAP[rating as RatingValue],
          feedback_choice: feedback_choice === 'ada' ? 'ada' : 'tidak_ada',
          feedback: typeof feedback === 'string' ? feedback.trim() : '',
          timestamp: Date.now(),
          date: dateStr,
          time: timeStr,
          status: 'valid',
          is_demo: false,
          created_at: now.toISOString(),
        };

        dbData.surveys.unshift(newSurvey);
        await saveData(dbData, env);

        return jsonResponse({ success: true, survey: newSurvey }, 201);
      } catch (err: any) {
        return jsonResponse({ error: 'Data belum dapat disimpan. Silakan coba kembali.' }, 500);
      }
    }

    // 4. Auth: Login
    if (path === '/api/auth/login' && method === 'POST') {
      try {
        const { username, password }: any = await request.json();
        if (!username || !password) {
          return jsonResponse({ error: 'Username dan password wajib diisi.' }, 400);
        }

        const user = dbData.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
        if (!user) {
          return jsonResponse({ error: 'Username atau password tidak sesuai.' }, 401);
        }

        const isMatch = bcrypt.compareSync(password, user.password_hash);
        if (!isMatch) {
          return jsonResponse({ error: 'Username atau password tidak sesuai.' }, 401);
        }

        const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
        sessions.set(token, {
          userId: user.id,
          username: user.username,
          role: user.role,
          expiresAt: Date.now() + SESSION_TTL_MS,
        });

        return jsonResponse({
          token,
          user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
          },
        });
      } catch (err: any) {
        return jsonResponse({ error: 'Terjadi kesalahan sistem saat login.' }, 500);
      }
    }

    // 5. Auth: Logout
    if (path === '/api/auth/logout' && method === 'POST') {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        sessions.delete(token);
      }
      return jsonResponse({ success: true });
    }

    // --- PROTECTED ROUTES REQUIRE ADMIN AUTH ---
    const session = verifyAuth(request);
    if (!session) {
      return jsonResponse({ error: 'Akses ditolak. Silakan login terlebih dahulu.' }, 401);
    }

    // 6. Auth: Me
    if (path === '/api/auth/me' && method === 'GET') {
      const user = dbData.users.find((u) => u.id === session.userId);
      if (!user) return jsonResponse({ error: 'User tidak ditemukan.' }, 404);
      return jsonResponse({
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
        },
      });
    }

    // 7. Auth: Change Password
    if (path === '/api/auth/change-password' && method === 'POST') {
      try {
        const { current_password, new_password }: any = await request.json();
        if (!current_password || !new_password) {
          return jsonResponse({ error: 'Password saat ini dan password baru wajib diisi.' }, 400);
        }
        if (new_password.length < 6) {
          return jsonResponse({ error: 'Password baru minimal 6 karakter.' }, 400);
        }

        const user = dbData.users.find((u) => u.id === session.userId);
        if (!user) return jsonResponse({ error: 'Pengguna tidak ditemukan.' }, 404);

        const isMatch = bcrypt.compareSync(current_password, user.password_hash);
        if (!isMatch) return jsonResponse({ error: 'Password saat ini tidak cocok.' }, 400);

        user.password_hash = bcrypt.hashSync(new_password, 10);
        user.updated_at = new Date().toISOString();
        await saveData(dbData, env);

        return jsonResponse({ success: true, message: 'Password berhasil diubah.' });
      } catch (err: any) {
        return jsonResponse({ error: 'Gagal mengubah password.' }, 500);
      }
    }

    // 8. Admin: Dashboard Stats
    if (path === '/api/admin/dashboard-stats' && method === 'GET') {
      const period = url.searchParams.get('period') || 'all';
      const serviceId = url.searchParams.get('service_id') || 'all';

      let list = [...dbData.surveys];
      if (serviceId !== 'all') {
        list = list.filter((s) => s.service_id === serviceId);
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date();

      if (period === 'today') {
        list = list.filter((s) => s.date === todayStr);
      } else if (period === 'this_week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        list = list.filter((s) => s.date >= oneWeekAgo);
      } else if (period === 'this_month') {
        const monthPrefix = todayStr.substring(0, 7);
        list = list.filter((s) => s.date.startsWith(monthPrefix));
      } else if (period === 'this_year') {
        const yearPrefix = todayStr.substring(0, 4);
        list = list.filter((s) => s.date.startsWith(yearPrefix));
      }

      const total = list.length;
      const todayCount = dbData.surveys.filter((s) => s.date === todayStr).length;

      const distribution = {
        sangat_puas: 0,
        puas: 0,
        cukup: 0,
        tidak_puas: 0,
      };

      let totalScore = 0;
      list.forEach((s) => {
        distribution[s.rating] = (distribution[s.rating] || 0) + 1;
        totalScore += s.rating_score;
      });

      const averageScore = total > 0 ? parseFloat((totalScore / total).toFixed(2)) : 0;
      const satisfiedCount = distribution.sangat_puas + distribution.puas;
      const satisfactionRate = total > 0 ? parseFloat(((satisfiedCount / total) * 100).toFixed(1)) : 0;

      const ikmScore = parseFloat((averageScore * 25).toFixed(1));
      let ikmGrade = 'Sangat Baik (A)';
      if (ikmScore < 64.99) ikmGrade = 'Tidak Baik (D)';
      else if (ikmScore < 76.6) ikmGrade = 'Kurang Baik (C)';
      else if (ikmScore < 88.3) ikmGrade = 'Baik (B)';

      // Trend
      const dateMap = new Map<string, { total: number; sp: number; p: number; c: number; tp: number; score: number }>();
      list.forEach((s) => {
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

      // Service breakdown
      const serviceMap = new Map<string, { name: string; total: number; sp: number; p: number; c: number; tp: number; score: number }>();
      list.forEach((s) => {
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

      const stats: SurveyStats = {
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

      return jsonResponse(stats);
    }

    // 9. Admin: Surveys List
    if (path === '/api/admin/surveys' && method === 'GET') {
      const search = url.searchParams.get('search');
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');
      const serviceId = url.searchParams.get('service_id');
      const rating = url.searchParams.get('rating');
      const page = parseInt(url.searchParams.get('page') || '1') || 1;
      const limit = parseInt(url.searchParams.get('limit') || '10') || 10;
      const sortBy = url.searchParams.get('sort_by') || 'created_at';
      const sortOrder = (url.searchParams.get('sort_order') as 'asc' | 'desc') || 'desc';

      let surveys = [...dbData.surveys];

      if (search) {
        const q = search.toLowerCase();
        surveys = surveys.filter(
          (s) =>
            s.service_name.toLowerCase().includes(q) ||
            (s.sub_service_name && s.sub_service_name.toLowerCase().includes(q)) ||
            s.feedback.toLowerCase().includes(q)
        );
      }

      if (startDate) surveys = surveys.filter((s) => s.date >= startDate);
      if (endDate) surveys = surveys.filter((s) => s.date <= endDate);
      if (serviceId && serviceId !== 'all') surveys = surveys.filter((s) => s.service_id === serviceId);
      if (rating && rating !== 'all') surveys = surveys.filter((s) => s.rating === rating);

      surveys.sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'rating') cmp = a.rating_score - b.rating_score;
        else if (sortBy === 'service') cmp = a.service_name.localeCompare(b.service_name);
        else cmp = (a.timestamp || 0) - (b.timestamp || 0);
        return sortOrder === 'desc' ? -cmp : cmp;
      });

      const total = surveys.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const paginated = surveys.slice(start, start + limit);

      return jsonResponse({
        surveys: paginated,
        total,
        page,
        limit,
        totalPages,
      });
    }

    // 10. Admin: Survey detail or delete
    const surveyIdMatch = path.match(/^\/api\/admin\/surveys\/([^\/]+)$/);
    if (surveyIdMatch) {
      const surveyId = surveyIdMatch[1];
      if (method === 'GET') {
        const survey = dbData.surveys.find((s) => s.id === surveyId);
        if (!survey) return jsonResponse({ error: 'Survei tidak ditemukan.' }, 404);
        return jsonResponse(survey);
      }
      if (method === 'DELETE') {
        const idx = dbData.surveys.findIndex((s) => s.id === surveyId);
        if (idx === -1) return jsonResponse({ error: 'Survei tidak ditemukan.' }, 404);
        dbData.surveys.splice(idx, 1);
        await saveData(dbData, env);
        return jsonResponse({ success: true });
      }
    }

    // 11. Admin: Seed Demo Data
    if (path === '/api/admin/surveys/seed-demo' && method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const count = parseInt(body.count) || 25;
      const sampleFeedbacks = [
        'Pelayanan sangat ramah dan jelas penjelasannya.',
        'Proses pendaftaran cepat dan informatif.',
        'Ruang tunggu nyaman dan bersih.',
        'Petugas informatif dalam membantu proses persidangan elektronik.',
        'Sangat memuaskan dan transparan.',
        'Pelayanan prima dan memuaskan.',
      ];

      const ratings: RatingValue[] = ['sangat_puas', 'puas', 'cukup', 'tidak_puas'];
      const ratingWeights = [0.65, 0.25, 0.07, 0.03];

      for (let i = 0; i < count; i++) {
        const service = dbData.services[Math.floor(Math.random() * dbData.services.length)];
        const rand = Math.random();
        let selectedRating: RatingValue = 'sangat_puas';
        let cum = 0;
        for (let j = 0; j < ratings.length; j++) {
          cum += ratingWeights[j];
          if (rand <= cum) {
            selectedRating = ratings[j];
            break;
          }
        }

        const daysAgo = Math.floor(Math.random() * 14);
        const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        const timeStr = `${String(8 + Math.floor(Math.random() * 7)).padStart(2, '0')}:${String(
          Math.floor(Math.random() * 60)
        ).padStart(2, '0')}:00`;

        dbData.surveys.push({
          id: `srv-demo-${Date.now()}-${i}`,
          service_id: service.id,
          service_name: service.name,
          rating: selectedRating,
          rating_score: RATING_SCORE_MAP[selectedRating],
          feedback_choice: Math.random() > 0.4 ? 'ada' : 'tidak_ada',
          feedback: Math.random() > 0.4 ? sampleFeedbacks[Math.floor(Math.random() * sampleFeedbacks.length)] : '',
          timestamp: d.getTime(),
          date: dateStr,
          time: timeStr,
          status: 'valid',
          is_demo: true,
          created_at: d.toISOString(),
        });
      }

      await saveData(dbData, env);
      return jsonResponse({
        success: true,
        count,
        message: `Berhasil menambahkan ${count} data simulasi.`,
      });
    }

    // 12. Admin: Clear Demo Surveys
    if (path === '/api/admin/surveys/clear-demo' && method === 'POST') {
      const initialLen = dbData.surveys.length;
      dbData.surveys = dbData.surveys.filter((s) => !s.id.includes('demo'));
      const removed = initialLen - dbData.surveys.length;
      await saveData(dbData, env);
      return jsonResponse({
        success: true,
        count: removed,
        message: `Berhasil menghapus ${removed} data simulasi.`,
      });
    }

    // 13. Admin: Clear All Surveys
    if (path === '/api/admin/surveys/clear-all' && method === 'POST') {
      const removed = dbData.surveys.length;
      dbData.surveys = [];
      await saveData(dbData, env);
      return jsonResponse({
        success: true,
        count: removed,
        message: `Berhasil mereset ${removed} seluruh data survei.`,
      });
    }

    // 14. Admin: Services (GET, POST)
    if (path === '/api/admin/services' && method === 'GET') {
      return jsonResponse(dbData.services.sort((a, b) => a.order_index - b.order_index));
    }

    if (path === '/api/admin/services' && method === 'POST') {
      const body: any = await request.json();
      const { name, description, icon_name, sub_services } = body;
      if (!name || !name.trim()) {
        return jsonResponse({ error: 'Nama jenis layanan wajib diisi.' }, 400);
      }

      const now = new Date().toISOString();
      const maxOrder = dbData.services.reduce((max, s) => Math.max(max, s.order_index), 0);
      const newService: Service = {
        id: 'srv-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        name: name.trim(),
        description: description?.trim() || '',
        icon_name: icon_name || 'Layers',
        order_index: maxOrder + 1,
        is_active: true,
        sub_services: Array.isArray(sub_services) ? sub_services : undefined,
        created_at: now,
        updated_at: now,
      };

      dbData.services.push(newService);
      await saveData(dbData, env);
      return jsonResponse(newService, 201);
    }

    // 15. Admin: Service by ID (PUT, DELETE)
    const serviceIdMatch = path.match(/^\/api\/admin\/services\/([^\/]+)$/);
    if (serviceIdMatch) {
      const serviceId = serviceIdMatch[1];
      const service = dbData.services.find((s) => s.id === serviceId);

      if (method === 'PUT') {
        if (!service) return jsonResponse({ error: 'Jenis layanan tidak ditemukan.' }, 404);
        const updates: any = await request.json();
        if (updates.name !== undefined) service.name = updates.name.trim();
        if (updates.description !== undefined) service.description = updates.description.trim();
        if (updates.icon_name !== undefined) service.icon_name = updates.icon_name;
        if (updates.order_index !== undefined) service.order_index = updates.order_index;
        if (updates.is_active !== undefined) service.is_active = updates.is_active;
        if (updates.sub_services !== undefined) service.sub_services = updates.sub_services;
        service.updated_at = new Date().toISOString();

        await saveData(dbData, env);
        return jsonResponse(service);
      }

      if (method === 'DELETE') {
        const idx = dbData.services.findIndex((s) => s.id === serviceId);
        if (idx === -1) return jsonResponse({ error: 'Jenis layanan tidak ditemukan.' }, 404);
        dbData.services.splice(idx, 1);
        await saveData(dbData, env);
        return jsonResponse({ success: true });
      }
    }

    // 16. Admin: Settings (GET, PUT)
    if (path === '/api/admin/settings' && method === 'GET') {
      return jsonResponse(dbData.settings);
    }

    if (path === '/api/admin/settings' && method === 'PUT') {
      const partialSettings: any = await request.json();
      dbData.settings = { ...dbData.settings, ...partialSettings };
      await saveData(dbData, env);
      return jsonResponse(dbData.settings);
    }

    // 17. Admin: Report Data
    if (path === '/api/admin/report' && method === 'GET') {
      const startDate = url.searchParams.get('start_date') || undefined;
      const endDate = url.searchParams.get('end_date') || undefined;
      const serviceId = url.searchParams.get('service_id') || 'all';

      let list = [...dbData.surveys];
      if (startDate) list = list.filter((s) => s.date >= startDate);
      if (endDate) list = list.filter((s) => s.date <= endDate);
      if (serviceId !== 'all') list = list.filter((s) => s.service_id === serviceId);

      const total = list.length;
      const counts = { sangat_puas: 0, puas: 0, cukup: 0, tidak_puas: 0 };
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

      const targetService = serviceId !== 'all' ? dbData.services.find((s) => s.id === serviceId) : null;
      const serviceName = targetService ? targetService.name : 'Seluruh Pelayanan PTSP';
      const periodLabel =
        startDate && endDate
          ? `${startDate} s/d ${endDate}`
          : startDate
          ? `Sejak ${startDate}`
          : endDate
          ? `Hingga ${endDate}`
          : 'Semua Periode';

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

      const serviceBreakdown = Array.from(sMap.entries()).map(([name, item]) => ({
        service_name: name,
        total: item.total,
        percentages: {
          sangat_puas: Number(((item.sp / item.total) * 100).toFixed(1)),
          puas: Number(((item.p / item.total) * 100).toFixed(1)),
          cukup: Number(((item.c / item.total) * 100).toFixed(1)),
          tidak_puas: Number(((item.tp / item.total) * 100).toFixed(1)),
        },
        avg_score: Number((item.scoreSum / item.total).toFixed(2)),
      }));

      const now = new Date();
      const report: ReportData = {
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

      return jsonResponse(report);
    }

    // 18. Admin: Export CSV/JSON
    if (path === '/api/admin/export' && method === 'GET') {
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');
      const serviceId = url.searchParams.get('service_id');
      const rating = url.searchParams.get('rating');
      const format = url.searchParams.get('format') === 'json' ? 'json' : 'csv';

      let list = [...dbData.surveys];
      if (startDate) list = list.filter((s) => s.date >= startDate);
      if (endDate) list = list.filter((s) => s.date <= endDate);
      if (serviceId && serviceId !== 'all') list = list.filter((s) => s.service_id === serviceId);
      if (rating && rating !== 'all') list = list.filter((s) => s.rating === rating);

      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      if (format === 'json') {
        return jsonResponse(list);
      }

      const ratingLabels: Record<string, string> = {
        sangat_puas: 'Sangat Puas',
        puas: 'Puas',
        cukup: 'Cukup',
        tidak_puas: 'Tidak Puas',
      };

      const headers = ['No', 'Tanggal', 'Waktu', 'Jenis Layanan', 'Penilaian', 'Skor', 'Saran'];
      const rows = list.map((s, index) => {
        const cleanFeedback = (s.feedback || '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
        const cleanServiceName = s.service_name.replace(/"/g, '""');
        const ratingLabel = ratingLabels[s.rating] || s.rating;
        return [
          index + 1,
          `"${s.date}"`,
          `"${s.time}"`,
          `"${cleanServiceName}"`,
          `"${ratingLabel}"`,
          s.rating_score,
          `"${cleanFeedback}"`,
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
      const filename = `Survei_Kepuasan_PTUN_Pangkalpinang_${Date.now()}.csv`;

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return jsonResponse({ error: 'Endpoint tidak ditemukan.' }, 404);
  },
};
