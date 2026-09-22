import {
  AppSettings,
  Service,
  Survey,
  SurveyStats,
  SurveyFilterParams,
  ReportData,
  RatingValue,
  AdminUser,
} from '../types';
import { clientStorage } from './clientStorage';

const TOKEN_KEY = 'ptun_survey_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const getAuthHeaders = (): HeadersInit => {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

let serverAvailable: boolean | null = null;

async function isServerRunning(): Promise<boolean> {
  if (serverAvailable !== null) return serverAvailable;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeout);
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      serverAvailable = true;
      return true;
    }
  } catch {
    // Offline / static hosting like GitHub Pages
  }
  serverAvailable = false;
  return false;
}

// --- Public Endpoints ---
export async function getPublicConfig(): Promise<{ settings: AppSettings; services: Service[] }> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/public/config');
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch (err) {
    console.warn('Backend API unreachable, using client storage:', err);
  }

  // Fallback to client storage
  return {
    settings: clientStorage.getSettings(),
    services: clientStorage.getServices(true),
  };
}

export async function submitSurvey(params: {
  service_id: string;
  sub_service_name?: string;
  rating: RatingValue;
  feedback_choice: 'ada' | 'tidak_ada';
  feedback?: string;
}): Promise<{ success: boolean; survey: Survey }> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/public/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch (err) {
    console.warn('Backend API error during submitSurvey, saving to client storage:', err);
  }

  const survey = clientStorage.submitSurvey(params);
  return { success: true, survey };
}

// --- Auth Endpoints ---
export async function loginAdmin(
  username: string,
  password: string,
): Promise<{ token: string; user: AdminUser }> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        setStoredToken(data.token);
        return data;
      }
      if (!res.ok && ct.includes('application/json')) {
        const data = await res.json();
        throw new Error(data.error || 'Username atau password tidak sesuai.');
      }
    }
  } catch (err: any) {
    if (serverAvailable) {
      throw err;
    }
  }

  const result = clientStorage.login(username, password);
  setStoredToken(result.token);
  return result;
}

export async function logoutAdmin(): Promise<void> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    }
  } catch {
    // Ignore network error on logout
  } finally {
    removeStoredToken();
  }
}

export async function getAdminProfile(): Promise<AdminUser> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/auth/me', {
        headers: getAuthHeaders(),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        return data.user;
      }
    }
  } catch {
    // Fallback to clientStorage
  }

  const token = getStoredToken();
  if (!token) throw new Error('Sesi tidak valid.');
  return clientStorage.getProfile();
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return;
      }
      if (!res.ok && ct.includes('application/json')) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengubah password.');
      }
    }
  } catch (err: any) {
    if (serverAvailable) throw err;
  }

  clientStorage.changePassword(currentPassword, newPassword);
}

// --- Admin Endpoints ---
export async function getDashboardStats(period = 'all', serviceId = 'all'): Promise<SurveyStats> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const query = new URLSearchParams({ period, service_id: serviceId });
      const res = await fetch(`/api/admin/dashboard-stats?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {
    // Fallback
  }

  return clientStorage.getStats(period, serviceId);
}

export async function getSurveysList(params: SurveyFilterParams): Promise<{
  surveys: Survey[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.start_date) query.append('start_date', params.start_date);
      if (params.end_date) query.append('end_date', params.end_date);
      if (params.service_id) query.append('service_id', params.service_id);
      if (params.rating) query.append('rating', params.rating);
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.sort_by) query.append('sort_by', params.sort_by);
      if (params.sort_order) query.append('sort_order', params.sort_order);

      const res = await fetch(`/api/admin/surveys?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {
    // Fallback
  }

  return clientStorage.getSurveysList(params);
}

export async function deleteSurveyItem(id: string): Promise<void> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch(`/api/admin/surveys/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) return;
    }
  } catch {
    // Fallback
  }

  clientStorage.deleteSurvey(id);
}

export async function seedDemoSurveys(count = 25): Promise<{ count: number; message: string }> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/admin/surveys/seed-demo', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ count }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {
    // Fallback
  }

  const seeded = clientStorage.seedDemoSurveys(count);
  return { count: seeded, message: `Berhasil menambahkan ${seeded} data simulasi.` };
}

export async function clearDemoSurveys(): Promise<{ count: number; message: string }> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/admin/surveys/clear-demo', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {
    // Fallback
  }

  const removed = clientStorage.clearDemoSurveys();
  return { count: removed, message: `Berhasil membersihkan ${removed} data simulasi.` };
}

export async function clearAllSurveys(): Promise<{ count: number; message: string }> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/admin/surveys/clear-all', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {
    // Fallback
  }

  const removed = clientStorage.clearAllSurveys();
  return { count: removed, message: `Berhasil mereset ${removed} seluruh data survei.` };
}

export async function getAdminServices(): Promise<Service[]> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/admin/services', {
        headers: getAuthHeaders(),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {
    // Fallback
  }

  return clientStorage.getServices(false);
}

export async function createAdminService(data: {
  name: string;
  description?: string;
  icon_name?: string;
  sub_services?: string[];
}): Promise<Service> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {
    // Fallback
  }

  return clientStorage.createService(data);
}

export async function updateAdminService(
  id: string,
  data: Partial<Service>,
): Promise<Service> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {
    // Fallback
  }

  const updated = clientStorage.updateService(id, data);
  if (!updated) throw new Error('Jenis layanan tidak ditemukan.');
  return updated;
}

export async function deleteAdminService(id: string): Promise<void> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) return;
    }
  } catch {
    // Fallback
  }

  const ok = clientStorage.deleteService(id);
  if (!ok) throw new Error('Jenis layanan tidak ditemukan.');
}

export async function getAdminSettings(): Promise<AppSettings> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/admin/settings', {
        headers: getAuthHeaders(),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {
    // Fallback
  }

  return clientStorage.getSettings();
}

export async function updateAdminSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {
    // Fallback
  }

  return clientStorage.updateSettings(settings);
}

export async function getReportData(
  startDate?: string,
  endDate?: string,
  serviceId?: string,
): Promise<ReportData> {
  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const query = new URLSearchParams();
      if (startDate) query.append('start_date', startDate);
      if (endDate) query.append('end_date', endDate);
      if (serviceId) query.append('service_id', serviceId);

      const res = await fetch(`/api/admin/report?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {
    // Fallback
  }

  return clientStorage.getReportData(startDate, endDate, serviceId);
}

export async function exportSurveyData(
  startDate?: string,
  endDate?: string,
  serviceId?: string,
  filename?: string,
): Promise<void> {
  const finalFilename =
    filename || `Survei_PTSP_PTUN_PKP_${startDate || 'Semua'}_sd_${endDate || 'Semua'}.csv`;

  try {
    const hasServer = await isServerRunning();
    if (hasServer) {
      const token = getStoredToken();
      const query = new URLSearchParams();
      if (startDate) query.append('start_date', startDate);
      if (endDate) query.append('end_date', endDate);
      if (serviceId && serviceId !== 'all') query.append('service_id', serviceId);
      query.append('format', 'csv');

      const res = await fetch(`/api/admin/export?${query.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const blob = await res.blob();
        triggerDownload(blob, finalFilename);
        return;
      }
    }
  } catch {
    // Fallback to clientStorage
  }

  const blob = clientStorage.exportCSV(startDate, endDate, serviceId);
  triggerDownload(blob, finalFilename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
