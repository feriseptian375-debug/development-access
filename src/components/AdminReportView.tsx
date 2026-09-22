import React, { useState, useEffect } from 'react';
import {
  Printer,
  Calendar,
  Filter,
  Layers,
  FileCheck,
  TrendingUp,
  Award,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { ReportData, Service, AppSettings } from '../types';
import { getReportData, getAdminServices } from '../services/api';

interface AdminReportViewProps {
  settings: AppSettings;
  onSettingsUpdated?: (updated: AppSettings) => void;
}

// Format waktu pencetakan Indonesia secara realtime: "22 September 2026 pukul 08.09 WIB"
export const formatRealtimePrintTimestamp = (date: Date = new Date()): string => {
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${m} ${y} pukul ${hh}.${mm} WIB`;
};

export const AdminReportView: React.FC<AdminReportViewProps> = ({
  settings,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Waktu pencetakan realtime
  const [realtimePrintTimestamp, setRealtimePrintTimestamp] = useState<string>(() =>
    formatRealtimePrintTimestamp()
  );

  useEffect(() => {
    // Perbarui waktu setiap detik agar selalu realtime saat tombol cetak ditekan
    const interval = setInterval(() => {
      setRealtimePrintTimestamp(formatRealtimePrintTimestamp());
    }, 1000);

    const handleBeforePrint = () => {
      const liveTime = formatRealtimePrintTimestamp();
      setRealtimePrintTimestamp(liveTime);
      document.title = liveTime;
    };

    const handleAfterPrint = () => {
      document.title = 'Sistem Survei Kepuasan Pelayanan PTUN Pangkalpinang';
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const data = await getReportData(
        startDate || undefined,
        endDate || undefined,
        selectedServiceId !== 'all' ? selectedServiceId : undefined,
      );
      setReport(data);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAdminServices().then(setServices).catch(console.error);
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedServiceId]);

  // Robust Printing: Direct & Fallback Window dengan Judul & Waktu Realtime
  const handlePrint = () => {
    const liveTime = formatRealtimePrintTimestamp();
    setRealtimePrintTimestamp(liveTime);
    const prevTitle = document.title;
    document.title = liveTime;

    try {
      window.print();
    } catch (err) {
      console.warn('Direct print failed, launching dedicated window:', err);
      handleOpenPrintWindow();
    } finally {
      setTimeout(() => {
        document.title = prevTitle;
      }, 1500);
    }
  };

  const handleOpenPrintWindow = () => {
    const liveTime = formatRealtimePrintTimestamp();
    setRealtimePrintTimestamp(liveTime);

    const sheet = document.getElementById('printable-report-sheet');
    if (!sheet) {
      window.print();
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    // Pastikan footer pencetakan pada sheet clone memuat waktu realtime terbaru
    const sheetClone = sheet.cloneNode(true) as HTMLElement;
    const tsElem = sheetClone.querySelector('#report-print-timestamp');
    if (tsElem) {
      tsElem.textContent = `Dicetak pada: ${liveTime}`;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>${liveTime}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: white; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .no-print { display: flex; gap: 8px; margin-bottom: 20px; }
            .btn-p { padding: 9px 18px; background: #1e3a8a; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
          <link rel="stylesheet" href="/src/index.css">
        </head>
        <body>
          <div class="no-print">
            <button class="btn-p" onclick="window.print()">🖨️ Cetak Dokumen Ini (A4)</button>
            <button class="btn-p" style="background:#64748b;" onclick="window.close()">Tutup Jendela</button>
          </div>
          ${sheetClone.innerHTML}
        </body>
      </html>
    `;
    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
    setTimeout(() => {
      try {
        printWin.focus();
        printWin.print();
      } catch (e) {
        console.warn(e);
      }
    }, 400);
  };

  return (
    <div id="admin-report-container" className="space-y-6">
      {/* Screen Only: Controls Bar */}
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Dari Tanggal
            </label>
            <input
              id="report-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium bg-slate-50 focus:bg-white focus:border-blue-900 outline-hidden"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Sampai Tanggal
            </label>
            <input
              id="report-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium bg-slate-50 focus:bg-white focus:border-blue-900 outline-hidden"
            />
          </div>

          {/* Service Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Jenis Layanan
            </label>
            <select
              id="report-service-filter"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium bg-slate-50 focus:bg-white focus:border-blue-900 outline-hidden max-w-xs"
            >
              <option value="all">Semua Layanan PTSP</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons: Print */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Print Button */}
          <button
            id="btn-print-report"
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan</span>
          </button>

          {/* Open in Dedicated Print Window */}
          <button
            type="button"
            onClick={handleOpenPrintWindow}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Buka tampilan cetak di tab / jendela baru"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Printable Report Document Sheet (Without Kop Surat, Only Report Content) */}
      <div
        id="printable-report-sheet"
        className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm max-w-4xl mx-auto text-slate-900 printable-sheet"
      >
        {/* Report Title (No Kop Surat as per instructions) */}
        <div className="text-center mb-6 pb-4 border-b-2 border-slate-900">
          <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase underline decoration-2 underline-offset-4">
            LAPORAN SURVEI KEPUASAN PELAYANAN PETUGAS PTSP
          </h3>
          <h4 className="text-sm md:text-base font-bold text-slate-800 uppercase mt-1">
            PENGADILAN TATA USAHA NEGARA PANGKALPINANG
          </h4>
          <p className="text-xs text-slate-600 mt-1 font-semibold">
            Unit Penyelenggara: Pelayanan Terpadu Satu Pintu (PTSP) PTUN Pangkalpinang
          </p>
        </div>

        {/* Meta Info Box */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6">
          <div>
            <span className="text-slate-500 font-bold block uppercase">Periode Evaluasi:</span>
            <span className="font-bold text-slate-900 text-sm">
              {report?.period_label || 'Semua Periode'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-bold block uppercase">Lingkup Pelayanan:</span>
            <span className="font-bold text-blue-900 text-sm">{report?.service_name}</span>
          </div>
        </div>

        {/* Summary Numbers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-xl border border-slate-200 bg-white text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Responden</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {report?.total_respondents || 0}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Rata-Rata Skor</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {report ? report.average_score.toFixed(2) : '0.00'}
            </span>
            <span className="text-[10px] text-slate-400">Skala 4.00</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Nilai IKM</span>
            <span className="text-2xl font-black text-blue-900 block mt-1">
              {report ? report.ikm_score.toFixed(2) : '0.00'}
            </span>
            <span className="text-[10px] text-slate-400">Skala 100</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Mutu Pelayanan</span>
            <span className="text-lg font-black text-emerald-700 block mt-2">
              {report?.ikm_grade || '-'}
            </span>
          </div>
        </div>

        {/* Tabel Rincian Distribusi Respon */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            I. Tabel Rekapitulasi Tingkat Kepuasan Masyarakat
          </h4>
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-2.5 border-r border-slate-300 text-center w-12">No</th>
                <th className="p-2.5 border-r border-slate-300">Tingkat Penilaian</th>
                <th className="p-2.5 border-r border-slate-300 text-center">Bobot Nilai</th>
                <th className="p-2.5 border-r border-slate-300 text-center">Jumlah Responden</th>
                <th className="p-2.5 text-center">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">1</td>
                <td className="p-2.5 border-r border-slate-200 font-bold flex items-center gap-2">
                  <span>😊</span> Sangat Puas
                </td>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">4</td>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">
                  {report?.counts.sangat_puas || 0}
                </td>
                <td className="p-2.5 text-center font-bold text-emerald-700">
                  {report?.percentages.sangat_puas || 0}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">2</td>
                <td className="p-2.5 border-r border-slate-200 font-bold flex items-center gap-2">
                  <span>🙂</span> Puas
                </td>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">3</td>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">
                  {report?.counts.puas || 0}
                </td>
                <td className="p-2.5 text-center font-bold text-blue-700">
                  {report?.percentages.puas || 0}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">3</td>
                <td className="p-2.5 border-r border-slate-200 font-bold flex items-center gap-2">
                  <span>😐</span> Cukup
                </td>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">2</td>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">
                  {report?.counts.cukup || 0}
                </td>
                <td className="p-2.5 text-center font-bold text-amber-700">
                  {report?.percentages.cukup || 0}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">4</td>
                <td className="p-2.5 border-r border-slate-200 font-bold flex items-center gap-2">
                  <span>🙁</span> Tidak Puas
                </td>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">1</td>
                <td className="p-2.5 border-r border-slate-200 text-center font-bold">
                  {report?.counts.tidak_puas || 0}
                </td>
                <td className="p-2.5 text-center font-bold text-rose-700">
                  {report?.percentages.tidak_puas || 0}%
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
              <tr>
                <td colSpan={3} className="p-2.5 border-r border-slate-300 text-right">
                  TOTAL KESELURUHAN
                </td>
                <td className="p-2.5 border-r border-slate-300 text-center font-black text-slate-900">
                  {report?.total_respondents || 0}
                </td>
                <td className="p-2.5 text-center font-black text-slate-900">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Visual Percentage Breakdown */}
        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            II. Proporsi Persentase Tingkat Kepuasan
          </h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-emerald-700 font-bold">Sangat Puas</span>
                <span>{report?.percentages.sangat_puas || 0}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${report?.percentages.sangat_puas || 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-blue-700 font-bold">Puas</span>
                <span>{report?.percentages.puas || 0}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${report?.percentages.puas || 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-amber-700 font-bold">Cukup</span>
                <span>{report?.percentages.cukup || 0}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${report?.percentages.cukup || 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-rose-700 font-bold">Tidak Puas</span>
                <span>{report?.percentages.tidak_puas || 0}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${report?.percentages.tidak_puas || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown per Layanan PTSP Table */}
        {report && report.service_breakdown.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              III. Rincian Per Meja / Loket Pelayanan PTSP
            </h4>
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300">Nama Layanan</th>
                  <th className="p-2 border-r border-slate-300 text-center">Responden</th>
                  <th className="p-2 border-r border-slate-300 text-center">Sangat Puas</th>
                  <th className="p-2 border-r border-slate-300 text-center">Puas</th>
                  <th className="p-2 border-r border-slate-300 text-center">Cukup</th>
                  <th className="p-2 border-r border-slate-300 text-center">Tidak Puas</th>
                  <th className="p-2 text-center">Rata-Rata Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.service_breakdown.map((s, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border-r border-slate-200 font-bold">{s.service_name}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-blue-900">
                      {s.total}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center text-emerald-700">
                      {s.percentages.sangat_puas}%
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center text-blue-700">
                      {s.percentages.puas}%
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center text-amber-700">
                      {s.percentages.cukup}%
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center text-rose-700">
                      {s.percentages.tidak_puas}%
                    </td>
                    <td className="p-2 text-center font-bold text-slate-900">
                      {s.avg_score.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Print Timestamp Footer */}
        <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-medium">
          <div>Dokumen resmi dicetak secara sistemik melalui aplikasi survei.</div>
          <div id="report-print-timestamp">Dicetak pada: {realtimePrintTimestamp}</div>
        </div>
      </div>
    </div>
  );
};
