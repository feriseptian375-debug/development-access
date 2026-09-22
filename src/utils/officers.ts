import { ServiceOfficer, Service } from '../types';

export const DEFAULT_OFFICIAL_LOGO =
  'https://media.canva.com/v2/download/name:LOGO+PTUN+PKP+TERBARU.png/uri:ifs%3A%2F%2FM%2F1bf733e1abd446f9aed2b2ccfdec0e1e?csig=AAAAAAAAAAAAAAAAAAAAAHYjLjd8PZ86bTrKEkscibX4WCN_E_TmfdqZ2phiQ8iO&exp=1790049450&signer=media-rpc&token=AAIAAU0AIDFiZjczM2UxYWJkNDQ2ZjlhZWQyYjJjY2ZkZWMwZTFlAAAAAAGgx-fDzHYn7PAwbx-Ilh5iISgbZQRGeWSkvs2NRmgt2FeKXhlr';

export const DEFAULT_OFFICER_PHOTOS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', // Wanita profesional
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80', // Pria profesional
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80', // Wanita profesional 2
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80', // Pria profesional 2
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', // Wanita profesional 3
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', // Pria profesional 3
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', // Pria profesional 4
];

export const INITIAL_OFFICERS: ServiceOfficer[] = [
  {
    id: 'srv-1:Meja Informasi dan Meja Pengaduan',
    service_id: 'srv-1',
    sub_service_name: 'Meja Informasi dan Meja Pengaduan',
    service_title: 'Meja Informasi dan Meja Pengaduan',
    officer_name: 'Siti Rahmawati, S.Kom.',
    officer_role: 'Petugas Informasi & Pengaduan PTSP',
    photo_url: DEFAULT_OFFICER_PHOTOS[0],
  },
  {
    id: 'srv-1:Meja 3',
    service_id: 'srv-1',
    sub_service_name: 'Meja 3',
    service_title: 'Meja 3 (Kepaniteraan Perkara)',
    officer_name: 'Hendra Wijaya, S.H.',
    officer_role: 'Petugas Administrasi Meja 3',
    photo_url: DEFAULT_OFFICER_PHOTOS[1],
  },
  {
    id: 'srv-1:Meja Kasir',
    service_id: 'srv-1',
    sub_service_name: 'Meja Kasir',
    service_title: 'Meja Kasir Pembayaran',
    officer_name: 'Rina Anggraini, A.Md.',
    officer_role: 'Petugas Kasir Keuangan Perkara',
    photo_url: DEFAULT_OFFICER_PHOTOS[2],
  },
  {
    id: 'srv-1:Meja Penerimaan Surat',
    service_id: 'srv-1',
    sub_service_name: 'Meja Penerimaan Surat',
    service_title: 'Meja Penerimaan Surat',
    officer_name: 'Budi Santoso, S.AP.',
    officer_role: 'Petugas Penerimaan Surat & Administrasi',
    photo_url: DEFAULT_OFFICER_PHOTOS[3],
  },
  {
    id: 'srv-1:Layanan E-Court',
    service_id: 'srv-1',
    sub_service_name: 'Layanan E-Court',
    service_title: 'Layanan E-Court Online',
    officer_name: 'Fajar Pratama, S.Kom.',
    officer_role: 'Helpdesk & Operator E-Court PTSP',
    photo_url: DEFAULT_OFFICER_PHOTOS[4],
  },
  {
    id: 'srv-5',
    service_id: 'srv-5',
    service_title: 'POSBAKUM (Pos Bantuan Hukum)',
    officer_name: 'Nurul Aini, S.H., M.H.',
    officer_role: 'Petugas Advokat POSBAKUM',
    photo_url: DEFAULT_OFFICER_PHOTOS[5],
  },
  {
    id: 'srv-6',
    service_id: 'srv-6',
    service_title: 'Layanan Lainnya',
    officer_name: 'Andi Saputra, S.Sos.',
    officer_role: 'Petugas Pelayanan Umum',
    photo_url: DEFAULT_OFFICER_PHOTOS[6],
  },
];

/**
 * Get officer for a service or desk
 */
export function getOfficerForService(
  configuredOfficers: ServiceOfficer[] | undefined,
  serviceId: string,
  subServiceName?: string | null,
): ServiceOfficer {
  const pool = configuredOfficers && configuredOfficers.length > 0 ? configuredOfficers : INITIAL_OFFICERS;

  // 1. Exact match with sub_service_name if provided
  if (subServiceName && subServiceName.trim()) {
    const match = pool.find(
      (o) =>
        (o.service_id === serviceId || o.id.startsWith(serviceId)) &&
        o.sub_service_name &&
        o.sub_service_name.trim().toLowerCase() === subServiceName.trim().toLowerCase(),
    );
    if (match) return match;

    // Check INITIAL_OFFICERS fallback
    const initMatch = INITIAL_OFFICERS.find(
      (o) =>
        o.sub_service_name &&
        o.sub_service_name.trim().toLowerCase() === subServiceName.trim().toLowerCase(),
    );
    if (initMatch) return initMatch;
  }

  // 2. Match service_id directly
  const matchService = pool.find((o) => o.service_id === serviceId && !o.sub_service_name);
  if (matchService) return matchService;

  // 3. Fallback matching by serviceId in pool
  const anyServiceMatch = pool.find((o) => o.service_id === serviceId);
  if (anyServiceMatch) return anyServiceMatch;

  // 4. Default fallback
  return {
    id: `${serviceId}:${subServiceName || 'default'}`,
    service_id: serviceId,
    sub_service_name: subServiceName || undefined,
    service_title: subServiceName || 'Pelayanan PTSP',
    officer_name: 'Petugas Pelayanan PTSP',
    officer_role: 'Petugas Pelayanan Terpadu Satu Pintu',
    photo_url: DEFAULT_OFFICER_PHOTOS[0],
  };
}

/**
 * Build a complete list of officers based on active services and their sub-services
 */
export function buildRequiredOfficerList(
  services: Service[],
  currentOfficers?: ServiceOfficer[],
): ServiceOfficer[] {
  const list: ServiceOfficer[] = [];
  const existingMap = new Map<string, ServiceOfficer>();

  (currentOfficers || []).forEach((o) => {
    existingMap.set(o.id, o);
    if (o.sub_service_name) {
      existingMap.set(`${o.service_id}:${o.sub_service_name}`, o);
    }
  });

  INITIAL_OFFICERS.forEach((o) => {
    if (!existingMap.has(o.id)) {
      existingMap.set(o.id, o);
    }
  });

  let photoIndex = 0;

  services.forEach((service) => {
    if (service.sub_services && service.sub_services.length > 0) {
      service.sub_services.forEach((subName) => {
        const key = `${service.id}:${subName}`;
        const existing = existingMap.get(key) || existingMap.get(subName);
        if (existing) {
          list.push({
            ...existing,
            id: key,
            service_id: service.id,
            sub_service_name: subName,
            service_title: subName,
          });
        } else {
          list.push({
            id: key,
            service_id: service.id,
            sub_service_name: subName,
            service_title: subName,
            officer_name: `Petugas ${subName}`,
            officer_role: `Petugas Pelayanan ${subName}`,
            photo_url: DEFAULT_OFFICER_PHOTOS[photoIndex % DEFAULT_OFFICER_PHOTOS.length],
          });
        }
        photoIndex++;
      });
    } else {
      const key = service.id;
      const existing = existingMap.get(key);
      if (existing) {
        list.push({
          ...existing,
          id: key,
          service_id: service.id,
          service_title: service.name,
        });
      } else {
        list.push({
          id: key,
          service_id: service.id,
          service_title: service.name,
          officer_name: `Petugas ${service.name}`,
          officer_role: `Petugas Pelayanan ${service.name}`,
          photo_url: DEFAULT_OFFICER_PHOTOS[photoIndex % DEFAULT_OFFICER_PHOTOS.length],
        });
      }
      photoIndex++;
    }
  });

  return list;
}
