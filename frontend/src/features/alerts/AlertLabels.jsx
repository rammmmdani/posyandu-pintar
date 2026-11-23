import Badge from '../../components/ui/Badge';

export const SEVERITY = {
  perlu_perhatian: { tone: 'perhatian', label: 'Perlu perhatian' },
  perlu_pemeriksaan: { tone: 'pemeriksaan', label: 'Perlu pemeriksaan' },
  perlu_tindak_lanjut: { tone: 'tindak', label: 'Perlu tindak lanjut' },
};

export const STATUS = {
  baru: { tone: 'perhatian', label: 'Baru' },
  dilihat: { tone: 'netral', label: 'Dilihat' },
  ditindaklanjuti: { tone: 'sukses', label: 'Ditindaklanjuti' },
  ditutup: { tone: 'netral', label: 'Ditutup' },
};

export const REFERRAL = {
  tidak_dirujuk: 'Tidak dirujuk',
  direncanakan: 'Dirujuk: direncanakan',
  sudah_dirujuk: 'Sudah dirujuk',
  selesai: 'Rujukan selesai',
};

export function SeverityBadge({ severity }) {
  const s = SEVERITY[severity];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function StatusBadge({ status }) {
  const s = STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

// Wajib tampil selama aturan peringatan belum divalidasi tenaga kesehatan (PRD 7.3).
export function ValidationTag({ validated }) {
  if (validated) return null;
  return (
    <span className="rounded-md border border-dashed border-amber-600 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
      contoh, belum divalidasi tenaga kesehatan
    </span>
  );
}