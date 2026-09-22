import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Building2,
  Info,
  FileText,
  Laptop,
  Scale,
  Layers,
  X,
  Check,
} from 'lucide-react';
import { Service } from '../types';
import {
  getAdminServices,
  createAdminService,
  updateAdminService,
  deleteAdminService,
} from '../services/api';
import { ConfirmModal } from './ConfirmModal';

export const AdminServicesView: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIconName, setFormIconName] = useState('Layers');
  const [formSubServicesText, setFormSubServicesText] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminServices();
      setServices(data);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openCreateModal = () => {
    setEditingService(null);
    setFormName('');
    setFormDescription('');
    setFormIconName('Layers');
    setFormSubServicesText('');
    setFormIsActive(true);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormName(service.name);
    setFormDescription(service.description || '');
    setFormIconName(service.icon_name || 'Layers');
    setFormSubServicesText((service.sub_services || []).join('\n'));
    setFormIsActive(service.is_active);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMessage('Nama jenis layanan wajib diisi.');
      return;
    }

    const parsedSubServices = formSubServicesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingService) {
        await updateAdminService(editingService.id, {
          name: formName,
          description: formDescription,
          icon_name: formIconName,
          is_active: formIsActive,
          sub_services: parsedSubServices.length > 0 ? parsedSubServices : undefined,
        });
      } else {
        await createAdminService({
          name: formName,
          description: formDescription,
          icon_name: formIconName,
          sub_services: parsedSubServices.length > 0 ? parsedSubServices : undefined,
        });
      }
      setIsModalOpen(false);
      fetchServices();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan jenis layanan.');
    }
  };

  const executeDeleteService = async () => {
    if (!serviceToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAdminService(serviceToDelete.id);
      setServiceToDelete(null);
      await fetchServices();
    } catch (err: any) {
      console.error('Error deleting service:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      await updateAdminService(service.id, { is_active: !service.is_active });
      fetchServices();
    } catch (err: any) {
      alert('Gagal mengubah status aktif.');
    }
  };

  const renderIcon = (name?: string) => {
    switch (name) {
      case 'Building2':
        return <Building2 className="w-5 h-5 text-blue-800" />;
      case 'Info':
        return <Info className="w-5 h-5 text-sky-700" />;
      case 'FileText':
        return <FileText className="w-5 h-5 text-indigo-700" />;
      case 'Laptop':
        return <Laptop className="w-5 h-5 text-emerald-700" />;
      case 'Scale':
        return <Scale className="w-5 h-5 text-amber-700" />;
      default:
        return <Layers className="w-5 h-5 text-slate-700" />;
    }
  };

  const iconOptions = [
    { label: 'Gedung / PTSP Umum', value: 'Building2' },
    { label: 'Informasi & Bantuan', value: 'Info' },
    { label: 'Berkas / Dokumen Perkara', value: 'FileText' },
    { label: 'E-Court / Komputer', value: 'Laptop' },
    { label: 'Posbakum / Timbangan Hukum', value: 'Scale' },
    { label: 'Layanan Lainnya', value: 'Layers' },
  ];

  return (
    <div id="admin-services-view" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900">Manajemen Jenis Layanan</h3>
          <p className="text-xs text-slate-500">
            Daftar loket dan meja pelayanan yang tampil pada halaman survei masyarakat
          </p>
        </div>

        <button
          id="btn-add-service"
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Layanan Baru</span>
        </button>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Memuat jenis layanan...</div>
        ) : services.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">Belum ada jenis layanan.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Urutan</th>
                <th className="py-3 px-4">Nama Layanan</th>
                <th className="py-3 px-4">Deskripsi</th>
                <th className="py-3 px-4 text-center">Ikon</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((service, index) => (
                <tr key={service.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-xs">
                    {index + 1}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div>{service.name}</div>
                    {service.sub_services && service.sub_services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {service.sub_services.map((sub, i) => (
                          <span
                            key={i}
                            className="inline-block text-[10px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/50"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs">
                    {service.description || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
                      {renderIcon(service.icon_name)}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(service)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        service.is_active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {service.is_active ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Nonaktif</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(service)}
                        className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors"
                        title="Edit Layanan"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceToDelete(service)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Layanan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL TAMBAH / EDIT LAYANAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              {editingService ? 'Ubah Jenis Layanan' : 'Tambah Jenis Layanan Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Layanan ini akan otomatis tampil di layar survei touchscreen masyarakat
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Nama Layanan *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Meja Informasi dan Konsultasi"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 text-sm font-medium outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Deskripsi Singkat</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Contoh: Layanan konsultasi perkara dan persuratan"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 text-sm font-medium outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Simbol Ikon</label>
                <select
                  value={formIconName}
                  onChange={(e) => setFormIconName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 text-sm font-medium outline-hidden"
                >
                  {iconOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Daftar Loket / Meja Sub-Pelayanan (Opsional)
                </label>
                <textarea
                  rows={4}
                  value={formSubServicesText}
                  onChange={(e) => setFormSubServicesText(e.target.value)}
                  placeholder="Tulis satu meja per baris, contoh:&#10;Meja Informasi dan Meja Pengaduan&#10;Meja 3&#10;Meja Kasir&#10;Meja Penerimaan Surat&#10;Layanan E-Court"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 text-xs font-mono outline-hidden leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Jika diisi, masyarakat yang memilih layanan ini akan memilih loket/meja terlebih dahulu sebelum memberikan penilaian. Kosongkan jika bukan layanan bertingkat.
                </p>
              </div>

              {editingService && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="checkbox-service-active"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-900 rounded-sm"
                  />
                  <label htmlFor="checkbox-service-active" className="text-sm font-bold text-slate-800">
                    Aktifkan layanan ini di layar survei
                  </label>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Modal Konfirmasi Hapus Layanan */}
      <ConfirmModal
        isOpen={!!serviceToDelete}
        title="Hapus Jenis Layanan?"
        message={`Apakah Anda yakin ingin menghapus jenis layanan "${serviceToDelete?.name}"? Seluruh data survei historis yang telah dinilai pada layanan ini akan tetap tersimpan secara aman di database.`}
        confirmLabel="Ya, Hapus Layanan"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={executeDeleteService}
        onCancel={() => setServiceToDelete(null)}
      />
    </div>
  );
};
