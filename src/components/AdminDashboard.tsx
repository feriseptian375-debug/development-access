import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Star,
  TrendingUp,
  Award,
  RefreshCw,
  PlusCircle,
  Trash2,
  AlertCircle,
  Smile,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { SurveyStats, Service } from '../types';
import {
  getDashboardStats,
  seedDemoSurveys,
  clearDemoSurveys,
  getAdminServices,
} from '../services/api';
import { ConfirmModal } from './ConfirmModal';

export const AdminDashboard: React.FC = () => {
  const [period, setPeriod] = useState<string>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isClearDemoModalOpen, setIsClearDemoModalOpen] = useState<boolean>(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await getDashboardStats(period, selectedServiceId);
      setStats(data);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAdminServices().then(setServices).catch(console.error);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [period, selectedServiceId]);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDemoSurveys(30);
      setActionMessage(res.message);
      await fetchStats();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(err.message || 'Gagal memuat data simulasi.');
    } finally {
      setIsSeeding(false);
    }
  };

  const executeClearDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await clearDemoSurveys();
      setActionMessage(res.message);
      setIsClearDemoModalOpen(false);
      await fetchStats();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(err.message || 'Gagal menghapus data simulasi.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Distribution chart data
  const distributionData = stats
    ? [
        { name: 'Sangat Puas', value: stats.distribution.sangat_puas, color: '#10b981', emoji: '😊' },
        { name: 'Puas', value: stats.distribution.puas, color: '#2563eb', emoji: '🙂' },
        { name: 'Cukup', value: stats.distribution.cukup, color: '#f59e0b', emoji: '😐' },
        { name: 'Tidak Puas', value: stats.distribution.tidak_puas, color: '#ef4444', emoji: '🙁' },
      ]
    : [];

  const hasData = stats && stats.total_respondents > 0;

  return (
    <div id="admin-dashboard-view" className="space-y-6">
      {/* Action Notification */}
      {actionMessage && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-700" />
            <span>{actionMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs text-blue-700 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Control Bar: Filters & Quick Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Periode Waktu
            </label>
            <select
              id="select-stats-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium bg-slate-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-hidden"
            >
              <option value="all">Semua Data</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="this_month">Bulan Ini</option>
              <option value="3months">3 Bulan Terakhir</option>
              <option value="this_year">Tahun Ini</option>
            </select>
          </div>

          {/* Service filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Jenis Layanan
            </label>
            <select
              id="select-stats-service"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium bg-slate-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-hidden max-w-xs"
            >
              <option value="all">Seluruh Layanan PTSP</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-stats"
            type="button"
            onClick={fetchStats}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Demo Data Seed / Clear Buttons */}
          <button
            id="btn-seed-demo-data"
            type="button"
            disabled={isSeeding}
            onClick={handleSeedDemo}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-blue-900 border border-slate-200 hover:border-blue-300 text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Muat 30 data simulasi untuk pengujian visual grafis"
          >
            <PlusCircle className="w-4 h-4 text-blue-700" />
            <span className="hidden md:inline">Muat Data Simulasi</span>
          </button>

          {hasData && (
            <button
              id="btn-clear-demo-data"
              type="button"
              disabled={isSeeding}
              onClick={() => setIsClearDemoModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Hapus data simulasi (data asli tetap tersimpan)"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span className="hidden md:inline">Bersihkan Simulasi</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* 1. TOTAL RESPONDEN */}
        <div
          id="stat-card-total-respondents"
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Responden
            </span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">
              {stats ? stats.total_respondents.toLocaleString('id-ID') : 0}
            </h3>
            <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md mt-1 inline-block">
              Akumulasi Penilaian
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center shrink-0">
            <Users className="w-7 h-7" />
          </div>
        </div>

        {/* 2. RESPONDEN HARI INI */}
        <div
          id="stat-card-today-respondents"
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Responden Hari Ini
            </span>
            <h3 className="text-3xl font-black text-blue-900 mt-1">
              {stats ? stats.today_respondents.toLocaleString('id-ID') : 0}
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Hari Berjalan
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Calendar className="w-7 h-7" />
          </div>
        </div>

        {/* 3. RATA-RATA SKOR */}
        <div
          id="stat-card-average-score"
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Rata-Rata Skor
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-3xl font-black text-slate-900">
                {stats ? stats.average_score.toFixed(2) : '0.00'}
              </h3>
              <span className="text-sm font-bold text-slate-400">/ 4.00</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-1 inline-block">
              Skor Penilaian
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Star className="w-7 h-7" />
          </div>
        </div>

        {/* 4. TINGKAT KEPUASAN */}
        <div
          id="stat-card-satisfaction-rate"
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tingkat Kepuasan
            </span>
            <h3 className="text-3xl font-black text-emerald-800 mt-1">
              {stats ? stats.satisfaction_rate : 0}%
            </h3>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md mt-1 inline-block">
              Puas + Sangat Puas
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0">
            <TrendingUp className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Bonus Official IKM (Indeks Kepuasan Masyarakat) Badge */}
      {stats && stats.total_respondents > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                Indeks Kepuasan Masyarakat (IKM) Resmi PTUN Pangkalpinang
              </span>
              <div className="text-lg md:text-xl font-black text-white">
                Nilai IKM: <span className="text-amber-300">{stats.ikm_score}</span> / 100 • Mutu Pelayanan:{' '}
                <span className="text-emerald-300">{stats.ikm_grade}</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-blue-200/80 font-medium">
            Sesuai Standar Evaluasi Pelayanan Publik KemenPAN-RB & MARI
          </div>
        </div>
      )}

      {/* Charts Section */}
      {!hasData ? (
        /* Empty State */
        <div
          id="empty-state-dashboard"
          className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center my-6"
        >
          <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <BarChart3 className="w-10 h-10" />
          </div>
          <h4 className="text-xl font-extrabold text-slate-800">Belum ada data survei</h4>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
            Data penilaian masyarakat akan muncul di sini setelah survei pertama dikirim.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleSeedDemo}
              className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold transition-all shadow-sm"
            >
              Muat Data Contoh / Demo untuk Uji Coba
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Grafik 1: Distribusi Kepuasan */}
          <div
            id="chart-card-distribution"
            className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Grafik 1: Distribusi Kepuasan</h4>
                  <p className="text-xs text-slate-500">Persentase & jumlah kategori respon</p>
                </div>
                <Smile className="w-5 h-5 text-blue-800" />
              </div>

              {/* Donut Chart */}
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`${value} Responden`, 'Jumlah']}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text in donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900">
                    {stats?.total_respondents}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Responden</span>
                </div>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100">
              {distributionData.map((d) => {
                const pct =
                  stats && stats.total_respondents > 0
                    ? ((d.value / stats.total_respondents) * 100).toFixed(1)
                    : '0';
                return (
                  <div key={d.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{d.emoji}</span>
                      <div className="text-xs font-bold text-slate-800">{d.name}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900">{d.value}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grafik 2: Tren Kepuasan Berdasarkan Tanggal */}
          <div
            id="chart-card-trend"
            className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Grafik 2: Tren Kepuasan</h4>
                  <p className="text-xs text-slate-500">Jumlah survei berdasarkan tanggal</p>
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>

              {/* Bar Chart of Trend */}
              <div className="h-64 w-full">
                {stats && stats.trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="formatted_date"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                        labelFormatter={(label) => `Tanggal: ${label}`}
                      />
                      <Bar dataKey="sangat_puas" name="Sangat Puas" stackId="a" fill="#10b981" />
                      <Bar dataKey="puas" name="Puas" stackId="a" fill="#2563eb" />
                      <Bar dataKey="cukup" name="Cukup" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="tidak_puas" name="Tidak Puas" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    Belum ada tren waktu pada rentang periode yang dipilih
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Sangat Puas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-600" /> Puas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500" /> Cukup
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500" /> Tidak Puas
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown per Layanan PTSP */}
      {stats && stats.service_breakdown.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h4 className="text-base font-extrabold text-slate-900 mb-1">
            Rekapitulasi Kepuasan Per Jenis Layanan
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            Rincian penilaian masyarakat pada masing-masing loket/meja pelayanan PTSP
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Jenis Layanan</th>
                  <th className="py-3 px-4 text-center">Total Responden</th>
                  <th className="py-3 px-4 text-center">Rata-Rata Skor</th>
                  <th className="py-3 px-4 text-center">Tingkat Kepuasan</th>
                  <th className="py-3 px-4 text-center">Sebaran (SP / P / C / TP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.service_breakdown.map((item) => (
                  <tr key={item.service_id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.service_name}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-900">{item.total}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-slate-800">{item.avg_score.toFixed(2)}</span>
                      <span className="text-xs text-slate-400"> / 4.00</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.satisfaction_rate >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.satisfaction_rate >= 60
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.satisfaction_rate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-semibold">
                      <span className="text-emerald-600 font-bold">{item.sangat_puas}</span> /{' '}
                      <span className="text-blue-600 font-bold">{item.puas}</span> /{' '}
                      <span className="text-amber-600 font-bold">{item.cukup}</span> /{' '}
                      <span className="text-rose-600 font-bold">{item.tidak_puas}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* In-app Modal Konfirmasi Bersihkan Simulasi */}
      <ConfirmModal
        isOpen={isClearDemoModalOpen}
        title="Bersihkan Data Simulasi?"
        message="Tindakan ini akan menghapus seluruh data survei pengujian (berlabel demo). Seluruh data survei asli dari masyarakat akan tetap aman tersimpan di database."
        confirmLabel="Ya, Bersihkan Data Simulasi"
        cancelLabel="Batal"
        variant="warning"
        isLoading={isSeeding}
        onConfirm={executeClearDemo}
        onCancel={() => setIsClearDemoModalOpen(false)}
      />
    </div>
  );
};
