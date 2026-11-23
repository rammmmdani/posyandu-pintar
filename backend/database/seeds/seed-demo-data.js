import { pool } from '../../src/config/db.js';
import { createChild, addConsent } from '../../src/modules/children/children.service.js';
import { createMeasurement } from '../../src/modules/measurements/measurements.service.js';
import { ageInMonths, todayString } from '../../src/utils/dates.js';

// DATA SINTETIS. Tidak mewakili anak sungguhan. Deterministik (seed tetap) agar demo dapat diulang.
// Jalankan setelah: schema.sql, seed:demo (akun), dan impor seluruh tabel WHO.
//   npm run seed:demo-data             -> membuat data (dilewati bila sudah ada)
//   npm run seed:demo-data -- --reset  -> menghapus data demo lama lalu membuat ulang

const NAMES = ['Adi', 'Bela', 'Citra', 'Dimas', 'Eka', 'Fajar', 'Gita', 'Hana', 'Indra', 'Joko', 'Kirana', 'Lia', 'Maya', 'Naufal', 'Okta',
  'Putri', 'Qori', 'Raka', 'Sari', 'Tito', 'Umar', 'Vina', 'Wira', 'Yuni', 'Zaki', 'Arga', 'Bima', 'Cinta', 'Dewi', 'Elang'];

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261123);
const normal = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round1 = (v) => Math.round(v * 10) / 10;
const addDays = (iso, d) => {
  const [y, m, dd] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd + d)).toISOString().slice(0, 10);
};

async function refRow(indicator, gender, months) {
  const { rows } = await pool.query(
    `SELECT l, m, s FROM who_growth_references
     WHERE indicator = $1 AND gender = $2 AND age_days <= $3 ORDER BY age_days DESC LIMIT 1`,
    [indicator, gender, Math.round(months * 30.4375)]
  );
  if (!rows[0]) throw new Error(`Referensi ${indicator} belum diimpor. Jalankan impor tabel WHO dulu.`);
  return rows[0];
}
// Nilai pengukuran pada z-score tertentu (kebalikan rumus LMS).
const valueAt = (r, z) => (r.l === 0 ? r.m * Math.exp(r.s * z) : r.m * Math.pow(1 + r.l * r.s * z, 1 / r.l));

const PROFILES = NAMES.map((_, i) => ({
  gender: i % 2 === 0 ? 'L' : 'P',
  ageNow: 5 + Math.floor(rand() * 36), // 5 sampai 40 bulan
  zw: clamp(normal() * 0.8, -1.6, 1.6),
  zh: clamp(normal() * 0.8, -1.6, 1.6),
  slope: 0,
}));
// Profil khusus agar demo memuat semua tingkat peringatan dan kasus tepi.
Object.assign(PROFILES[3], { zw: -2.4, zh: -0.5 });
Object.assign(PROFILES[7], { zw: -3.5, zh: -3.2, slope: -0.1 });
Object.assign(PROFILES[11], { zw: 2.3, zh: 0.2 });
Object.assign(PROFILES[16], { zw: -2.6, zh: -2.3 });
Object.assign(PROFILES[21], { zw: 3.4, zh: 0.0 });
PROFILES[25].noBirth = true; // tanggal lahir belum diketahui
PROFILES[28].withdraw = true; // persetujuan wali ditarik

async function reset() {
  const { rows } = await pool.query(`SELECT id FROM children WHERE name LIKE '% Contoh'`);
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return;
  const q = (sql) => pool.query(sql, [ids]);
  await q('DELETE FROM notifications WHERE alert_id IN (SELECT id FROM alerts WHERE child_id = ANY($1::bigint[]))');
  await q('DELETE FROM follow_ups WHERE alert_id IN (SELECT id FROM alerts WHERE child_id = ANY($1::bigint[]))');
  await q('DELETE FROM alerts WHERE child_id = ANY($1::bigint[])');
  await q('DELETE FROM growth_assessments WHERE measurement_id IN (SELECT id FROM measurements WHERE child_id = ANY($1::bigint[]))');
  await q('DELETE FROM measurements WHERE child_id = ANY($1::bigint[])');
  await q('DELETE FROM child_allergies WHERE child_id = ANY($1::bigint[])');
  await q('DELETE FROM guardian_consents WHERE child_id = ANY($1::bigint[])');
  await q('DELETE FROM children WHERE id = ANY($1::bigint[])');
  console.log(`Data demo lama dihapus (${ids.length} balita).`);
}

async function main() {
  if (process.argv.includes('--reset')) await reset();
  const existing = await pool.query(`SELECT count(*)::int AS n FROM children WHERE name LIKE '% Contoh'`);
  if (existing.rows[0].n > 0) {
    console.log('Data demo sudah ada. Pakai --reset untuk membuat ulang.');
    return;
  }

  const { rows } = await pool.query(
    `SELECT id, posyandu_id, name, email, role, is_active FROM users WHERE email = 'kader@demo.test'`
  );
  const user = rows[0];
  if (!user) throw new Error('Akun kader@demo.test tidak ada. Jalankan npm run seed:demo dulu.');

  const today = todayString();
  let measurements = 0;

  for (let i = 0; i < NAMES.length; i += 1) {
    const p = PROFILES[i];
    const birth = p.noBirth ? null : addDays(today, -Math.round(p.ageNow * 30.4375) - Math.floor(rand() * 20));
    const parent = `Ibu ${NAMES[i]} Contoh`;

    const child = await createChild(user, {
      name: `${NAMES[i]} Contoh`, birth_date: birth, gender: p.gender,
      parent_name: parent, parent_phone: null, address: null, confirm_duplicate: true,
      consent: { guardian_name: parent, method: 'lisan', notice_version: 'v1' },
    }, '127.0.0.1');

    const n = Math.min(6, p.ageNow);
    for (let k = n - 1; k >= 0; k -= 1) {
      const date = addDays(today, -(k * 30 + (i % 9)));
      if (birth && date < birth) continue;
      const months = birth ? ageInMonths(birth, date) : p.ageNow - k;
      if (months < 0 || months > 59) continue;

      const t = n - 1 - k;
      const zw = p.zw + p.slope * t + normal() * 0.12;
      const zh = p.zh + normal() * 0.1;
      const recumbent = months < 24;
      const refW = await refRow('bb_u', p.gender, months);
      const refH = await refRow(recumbent ? 'pb_u' : 'tb_u', p.gender, months);

      await createMeasurement(user, child.id, {
        measurement_date: date,
        weight_kg: round1(valueAt(refW, zw)),
        height_cm: round1(valueAt(refH, zh)),
        measurement_type: recumbent ? 'recumbent' : 'standing',
        notes: null,
      }, '127.0.0.1');
      measurements += 1;
    }

    if (p.withdraw) {
      await addConsent(user, child.id, { consent_status: 'ditarik', guardian_name: parent, method: 'lisan', notice_version: 'v1' }, '127.0.0.1');
    }
  }

  console.log(`Data demo dibuat: ${NAMES.length} balita, ${measurements} pengukuran.`);
}

main()
  .catch((err) => {
    console.error('Seed data demo gagal:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());