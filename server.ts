import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { RatingValue } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple in-memory session token storage
interface SessionInfo {
  userId: string;
  username: string;
  role: string;
  expiresAt: number;
}
const sessions = new Map<string, SessionInfo>();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Auth Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' });
  }

  const token = authHeader.substring(7).trim();
  const session = sessions.get(token);

  if (!session) {
    return res.status(401).json({ error: 'Sesi telah berakhir atau tidak valid. Silakan login kembali.' });
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Sesi kedaluwarsa. Silakan login kembali.' });
  }

  // Touch session
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  (req as any).user = session;
  next();
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', name: 'PTUN Pangkalpinang Survey API' });
});

// --- Public Survey Endpoints ---
app.get('/api/public/config', (_req: Request, res: Response) => {
  try {
    const settings = db.getSettings();
    const services = db.getServices(true); // active only
    res.json({ settings, services });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat konfigurasi aplikasi.' });
  }
});

app.post('/api/public/survey', (req: Request, res: Response) => {
  try {
    const { service_id, sub_service_name, rating, feedback_choice, feedback } = req.body;

    if (!service_id || !rating) {
      return res.status(400).json({
        error: 'Silakan pilih jenis layanan dan berikan penilaian terlebih dahulu.',
      });
    }

    const validRatings: RatingValue[] = ['sangat_puas', 'puas', 'cukup', 'tidak_puas'];
    if (!validRatings.includes(rating)) {
      return res.status(400).json({ error: 'Nilai rating tidak valid.' });
    }

    const survey = db.createSurvey({
      service_id,
      sub_service_name: typeof sub_service_name === 'string' && sub_service_name.trim() ? sub_service_name.trim() : undefined,
      rating,
      feedback_choice: feedback_choice === 'ada' ? 'ada' : 'tidak_ada',
      feedback: typeof feedback === 'string' ? feedback : '',
    });

    res.status(201).json({ success: true, survey });
  } catch (err: any) {
    console.error('Error saving survey:', err);
    res.status(500).json({ error: 'Data belum dapat disimpan. Silakan coba kembali.' });
  }
});

// --- Authentication Endpoints ---
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Username atau password tidak sesuai.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Username atau password tidak sesuai.' });
    }

    const token = generateToken();
    sessions.set(token, {
      userId: user.id,
      username: user.username,
      role: user.role,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Terjadi kesalahan sistem saat login.' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    sessions.delete(token);
  }
  res.json({ success: true });
});

app.get('/api/auth/me', requireAdmin, (req: Request, res: Response) => {
  const sessionUser = (req as any).user;
  const user = db.getUserById(sessionUser.userId);
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }
  res.json({
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    },
  });
});

app.post('/api/auth/change-password', requireAdmin, (req: Request, res: Response) => {
  try {
    const { current_password, new_password } = req.body;
    const sessionUser = (req as any).user;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Password saat ini dan password baru wajib diisi.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
    }

    const user = db.getUserById(sessionUser.userId);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const isMatch = bcrypt.compareSync(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Password saat ini tidak cocok.' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    db.updatePassword(user.id, newHash);

    res.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengubah password.' });
  }
});

// --- Admin Protected Endpoints ---

// Dashboard statistics
app.get('/api/admin/dashboard-stats', requireAdmin, (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'all';
    const service_id = (req.query.service_id as string) || 'all';
    const stats = db.getStats(period, service_id);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat statistik dashboard.' });
  }
});

// Survey list with filter, search, pagination, sort
app.get('/api/admin/surveys', requireAdmin, (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;
    const service_id = req.query.service_id as string;
    const rating = req.query.rating as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort_by = req.query.sort_by as string;
    const sort_order = (req.query.sort_order as 'asc' | 'desc') || 'desc';

    const result = db.getSurveys({
      search,
      start_date,
      end_date,
      service_id,
      rating,
      page,
      limit,
      sort_by,
      sort_order,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil data survei.' });
  }
});

app.get('/api/admin/surveys/:id', requireAdmin, (req: Request, res: Response) => {
  const survey = db.getSurveyById(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: 'Survei tidak ditemukan.' });
  }
  res.json(survey);
});

app.delete('/api/admin/surveys/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteSurvey(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Survei tidak ditemukan.' });
  }
  res.json({ success: true });
});

// Demo Data Actions
app.post('/api/admin/surveys/seed-demo', requireAdmin, (req: Request, res: Response) => {
  const count = parseInt(req.body.count) || 25;
  const seeded = db.seedDemoSurveys(count);
  res.json({ success: true, count: seeded, message: `Berhasil menambahkan ${seeded} data simulasi.` });
});

app.post('/api/admin/surveys/clear-demo', requireAdmin, (_req: Request, res: Response) => {
  const removed = db.clearDemoSurveys();
  res.json({ success: true, count: removed, message: `Berhasil menghapus ${removed} data simulasi.` });
});

app.post('/api/admin/surveys/clear-all', requireAdmin, (_req: Request, res: Response) => {
  const removed = db.clearAllSurveys();
  res.json({ success: true, count: removed, message: `Berhasil mereset ${removed} seluruh data survei.` });
});

// Services Management
app.get('/api/admin/services', requireAdmin, (_req: Request, res: Response) => {
  res.json(db.getServices(false));
});

app.post('/api/admin/services', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, description, icon_name, sub_services } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama jenis layanan wajib diisi.' });
    }
    const created = db.createService({ name, description, icon_name, sub_services });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menambah jenis layanan.' });
  }
});

app.put('/api/admin/services/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const updated = db.updateService(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Jenis layanan tidak ditemukan.' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memperbarui jenis layanan.' });
  }
});

app.delete('/api/admin/services/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteService(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Jenis layanan tidak ditemukan.' });
  }
  res.json({ success: true });
});

// Settings Management
app.get('/api/admin/settings', requireAdmin, (_req: Request, res: Response) => {
  res.json(db.getSettings());
});

app.put('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memperbarui pengaturan aplikasi.' });
  }
});

// Report Generation
app.get('/api/admin/report', requireAdmin, (req: Request, res: Response) => {
  try {
    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;
    const service_id = (req.query.service_id as string) || 'all';
    const report = db.getReport(start_date, end_date, service_id);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menyusun laporan kepuasan pelayanan.' });
  }
});

// Export CSV / Data
app.get('/api/admin/export', requireAdmin, (req: Request, res: Response) => {
  try {
    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;
    const service_id = req.query.service_id as string;
    const rating = req.query.rating as string;

    const result = db.getSurveys({
      start_date,
      end_date,
      service_id,
      rating,
      page: 1,
      limit: 100000,
      sort_by: 'timestamp',
      sort_order: 'desc',
    });

    const format = req.query.format === 'json' ? 'json' : 'csv';

    if (format === 'json') {
      return res.json(result.surveys);
    }

    // CSV format with UTF-8 BOM (\uFEFF) for Excel Indonesian character support
    const ratingLabels: Record<string, string> = {
      sangat_puas: 'Sangat Puas',
      puas: 'Puas',
      cukup: 'Cukup',
      tidak_puas: 'Tidak Puas',
    };

    const headers = ['No', 'Tanggal', 'Waktu', 'Jenis Layanan', 'Penilaian', 'Skor', 'Saran'];
    const rows = result.surveys.map((s, index) => {
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

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengekspor data survei.' });
  }
});

// --- Vite Middleware (Development) / Static Files (Production) ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PTUN Pangkalpinang Survey Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
