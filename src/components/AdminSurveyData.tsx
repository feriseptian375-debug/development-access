import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  Star,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  FileSpreadsheet,
  X,
  FileText,
  Clock,
} from 'lucide-react';
import { Survey, Service } from '../types';
import {
  getSurveysList,
  getAdminServices,
  deleteSurveyItem,
  exportSurveyData,
} from '../services/api';
import { ConfirmModal } from './ConfirmModal';

export const AdminSurveyData: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Detail Modal
  const [activeSurveyDetail, setActiveSurveyDetail] = useState<Survey | null>(null);

  // Delete Confirmation Modal State
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Export Modal
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exportServiceId, setExportServiceId] = useState<string>('all');

  const fetchSurveys = async () => {
    setIsLoading(true);
    try {
      const data = await getSurveysList({
        search: search.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        service_id: selectedServiceId !== 'all' ? selectedServiceId : undefined,
        rating: selectedRating !== 'all' ? selectedRating : undefined,
        page,
        limit,
        sort_by: sortBy as any,
        sort_order: sortOrder,
      });

      setSurveys(data.surveys);
      setTotal(data.total);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Error fetching surveys:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAdminServices().then(setServices).catch(console.error);
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, [page, limit, startDate, endDate, selectedServiceId, selectedRating, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSurveys();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setSelectedServiceId('all');
    setSelectedRating('all');
    setSortBy('timestamp');
    setSortOrder('desc');
    setPage(1);
  };

  const executeDeleteSurvey = async () => {
    if (!surveyToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSurveyItem(surveyToDelete.id);
      if (activeSurveyDetail?.id === surveyToDelete.id) {
        setActiveSurveyDetail(null);
      }
      setSurveyToDelete(null);
      await fetchSurveys();
    } catch (err: any) {
      console.error('Error deleting survey:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export function: triggers direct download with token or clientStorage fallback
  const handleTriggerExport = async (format: 'csv' | 'excel') => {
    try {
      const ext = format === 'excel' ? 'csv' : 'csv';
      const filename = `Survei_PTSP_PTUN_PKP_${exportStartDate || 'Semua'}_sd_${exportEndDate || 'Semua'}.${ext}`;
      await exportSurveyData(exportStartDate, exportEndDate, exportServiceId, filename);
      setShowExportModal(false);
    } catch (err: any) {
      alert(err.message || 'Gagal export data.');
    }
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'sangat_puas':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <span>😊</span> Sangat Puas
          </span>
        );
      case 'puas':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900">
            <span>🙂</span> Puas
          </span>
        );
      case 'cukup':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <span>😐</span> Cukup
          </span>
        );
      case 'tidak_puas':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <span>🙁</span> Tidak Puas
          </span>
        );
      default:
        return rating;
    }
  };

  return (
    <div id="admin-survey-data-page" className="space-y-6">
      {/* Top Header & Export Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900">Data Survei Kepuasan</h3>
          <p className="text-xs text-slate-500">
            Total {total} respon penilaian masyarakat tersimpan di database
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-open-export-excel"
            type="button"
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3">
          {/* Search text */}
          <div className="flex-1 min-w-[240px] relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="input-survey-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari saran, jenis layanan, tanggal..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 text-sm outline-hidden"
            />
          </div>

          <button
            id="btn-apply-search"
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold transition-colors"
          >
            Cari
          </button>

          {(search || startDate || endDate || selectedServiceId !== 'all' || selectedRating !== 'all') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Reset Filter
            </button>
          )}
        </form>

        {/* Extended Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Tanggal Mulai */}
          <div>
            <label className="block text-slate-500 font-bold uppercase mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium"
            />
          </div>

          {/* Tanggal Akhir */}
          <div>
            <label className="block text-slate-500 font-bold uppercase mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium"
            />
          </div>

          {/* Filter Jenis Layanan */}
          <div>
            <label className="block text-slate-500 font-bold uppercase mb-1">Jenis Layanan</label>
            <select
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium"
            >
              <option value="all">Semua Layanan</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Rating */}
          <div>
            <label className="block text-slate-500 font-bold uppercase mb-1">Penilaian</label>
            <select
              value={selectedRating}
              onChange={(e) => {
                setSelectedRating(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium"
            >
              <option value="all">Semua Penilaian</option>
              <option value="sangat_puas">😊 Sangat Puas (4)</option>
              <option value="puas">🙂 Puas (3)</option>
              <option value="cukup">😐 Cukup (2)</option>
              <option value="tidak_puas">🙁 Tidak Puas (1)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm font-medium">
            Memuat data survei...
          </div>
        ) : surveys.length === 0 ? (
          /* Empty state */
          <div id="table-empty-state" className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">Belum ada data survei</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Data penilaian masyarakat akan muncul di sini setelah survei pertama dikirim atau setelah
              filter disesuaikan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="table-surveys" className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b border-slate-200 select-none">
                <tr>
                  <th className="py-3.5 px-4 text-center w-12">No</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      setSortBy('timestamp');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Tanggal & Waktu
                  </th>
                  <th className="py-3.5 px-4">Jenis Layanan</th>
                  <th className="py-3.5 px-4">Penilaian</th>
                  <th className="py-3.5 px-4 text-center">Skor</th>
                  <th className="py-3.5 px-4 max-w-xs">Saran / Masukan</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {surveys.map((survey, index) => {
                  const itemNumber = (page - 1) * limit + index + 1;
                  return (
                    <tr key={survey.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-bold text-xs">
                        {itemNumber}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{survey.date}</div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {survey.time} WIB
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{survey.service_name}</span>
                        {survey.is_demo && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm">
                            Demo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">{getRatingBadge(survey.rating)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-black text-slate-900 text-base">{survey.rating_score}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {survey.feedback ? (
                          <p className="text-xs text-slate-600 line-clamp-2 italic font-normal">
                            "{survey.feedback}"
                          </p>
                        ) : (
                          <span className="text-xs text-slate-300 italic">- Tidak ada -</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveSurveyDetail(survey)}
                            className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors"
                            title="Lihat Detail Lengkap"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSurveyToDelete(survey)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Data Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <span>Menampilkan baris per halaman:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-400">
                (Total {total} data • Halaman {page} dari {totalPages})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-bold text-slate-800">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {activeSurveyDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => setActiveSurveyDetail(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-1">Detail Respon Survei</h3>
            <p className="text-xs text-slate-400 font-mono mb-6">ID: {activeSurveyDetail.id}</p>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase">Waktu Pengisian</span>
                <span className="font-bold text-slate-800">
                  {activeSurveyDetail.date} • {activeSurveyDetail.time} WIB
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase">Jenis Layanan</span>
                <span className="font-extrabold text-blue-900">
                  {activeSurveyDetail.service_name}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase">Penilaian</span>
                <div>{getRatingBadge(activeSurveyDetail.rating)}</div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase">Skor Rating</span>
                <span className="font-black text-lg text-slate-900">
                  {activeSurveyDetail.rating_score} / 4
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                  Saran / Masukan Responden
                </span>
                <p className="text-slate-800 font-medium whitespace-pre-wrap">
                  {activeSurveyDetail.feedback || 'Tidak ada saran/masukan tertulis.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSurveyToDelete(activeSurveyDetail)}
                className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer"
              >
                Hapus Survei
              </button>
              <button
                type="button"
                onClick={() => setActiveSurveyDetail(null)}
                className="px-5 py-2.5 rounded-xl bg-blue-900 text-white text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => setShowExportModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Export Data Survei</h3>
                <p className="text-xs text-slate-500">Pilih rentang periode sebelum unduh</p>
              </div>
            </div>

            <div className="space-y-4 my-6 text-xs">
              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Jenis Layanan</label>
                <select
                  value={exportServiceId}
                  onChange={(e) => setExportServiceId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 font-medium"
                >
                  <option value="all">Semua Jenis Layanan</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTriggerExport('excel')}
                className="py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleTriggerExport('csv')}
                className="py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app Modal Konfirmasi Hapus Survei */}
      <ConfirmModal
        isOpen={!!surveyToDelete}
        title="Hapus Data Survei?"
        message={`Apakah Anda yakin ingin menghapus data survei pada layanan "${surveyToDelete?.service_name}" tanggal ${surveyToDelete?.date} (${surveyToDelete?.time} WIB)? Tindakan ini akan menghapus data secara permanen dari database.`}
        confirmLabel="Ya, Hapus Data"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={executeDeleteSurvey}
        onCancel={() => setSurveyToDelete(null)}
      />
    </div>
  );
};
