// Mock mengikuti API_CONTRACT.md bagian 3.1 (daftar balita) dan 4.1 (riwayat consent).
// Bentuknya SAMA dengan body response API asli (dengan pembungkus success/message/data/meta).

export const childrenListMock = {
  success: true,
  message: 'Berhasil',
  data: [
    {
      id: 1,
      name: 'Budi Santoso',
      birth_date: '2024-03-12',
      gender: 'L',
      parent_name: 'Ahmad Santoso',
      parent_phone: '081234567890',
      address: 'Jl. Melati No. 5, Bekasi',
      rt: '001',
      rw: '002',
      status: 'aktif',
      consent_status: 'diberikan',
      created_at: '2026-10-01T03:00:00.000Z',
      updated_at: '2026-10-01T03:00:00.000Z',
    },
    {
      id: 2,
      name: 'Sari Lestari',
      birth_date: '2023-11-05',
      gender: 'P',
      parent_name: 'Dewi Lestari',
      parent_phone: null,
      address: 'Jl. Kenanga No. 12, Bekasi',
      rt: '010',
      rw: '003',
      status: 'aktif',
      consent_status: null,
      created_at: '2026-10-02T03:30:00.000Z',
      updated_at: '2026-10-02T03:30:00.000Z',
    },
  ],
  meta: { page: 1, per_page: 10, total: 2, total_pages: 1 },
};

// Riwayat consent untuk satu balita (anak id 1)
export const consentsMock = {
  success: true,
  message: 'Berhasil',
  data: [
    {
      id: 1,
      child_id: 1,
      guardian_name: 'Ahmad Santoso',
      consent_status: 'diberikan',
      method: 'tertulis',
      notice_version: 'v1.0',
      consented_at: '2026-10-01T03:05:00.000Z',
      withdrawn_at: null,
      recorded_by: 1,
      created_at: '2026-10-01T03:05:00.000Z',
    },
  ],
};