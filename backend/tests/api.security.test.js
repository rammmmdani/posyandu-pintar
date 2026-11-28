import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

// Jalankan server dulu (npm run dev) dengan data demo, lalu: npm run test:api
const BASE = process.env.API_URL || 'http://localhost:5000/api/v1';
const PASSWORD = process.env.DEMO_PASSWORD || 'Demo12345';
const ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0].trim();

async function call(method, path, { token, body, raw, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  let json = null;
  try { json = await res.json(); } catch { /* bukan JSON */ }
  return { status: res.status, json, headers: res.headers };
}

async function login(email) {
  const r = await call('POST', '/auth/login', { body: { email, password: PASSWORD } });
  assert.equal(r.status, 200, `login ${email} gagal (status ${r.status})`);
  return r.json.data.token;
}

let kader; let koordinator; let kaderB; let koordinatorB; let childId;

before(async () => {
  // Posyandu kedua dengan kader dan koordinator, untuk menguji isolasi data.
  let { rows } = await pool.query("SELECT id FROM posyandus WHERE name = 'Posyandu Uji B'");
  if (!rows[0]) ({ rows } = await pool.query("INSERT INTO posyandus (name) VALUES ('Posyandu Uji B') RETURNING id"));
  const hash = await bcrypt.hash(PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (posyandu_id, name, email, password_hash, role)
     VALUES ($1, 'Kader B', 'kaderb@demo.test', $2, 'kader') ON CONFLICT ((lower(email))) DO NOTHING`,
    [rows[0].id, hash]
  );
  await pool.query(
    `INSERT INTO users (posyandu_id, name, email, password_hash, role)
     VALUES ($1, 'Koordinator B', 'koordinatorb@demo.test', $2, 'koordinator') ON CONFLICT ((lower(email))) DO NOTHING`,
    [rows[0].id, hash]
  );
  kader = await login('kader@demo.test');
  koordinator = await login('koordinator@demo.test');
  kaderB = await login('kaderb@demo.test');
  koordinatorB = await login('koordinatorb@demo.test');
  const list = await call('GET', '/children?limit=1', { token: kader });
  childId = list.json?.data?.[0]?.id;
});

after(() => pool.end());

const PROTECTED = [
  ['GET', '/auth/me'], ['GET', '/children'], ['GET', '/children/1'], ['GET', '/children/1/measurements'],
  ['GET', '/children/1/growth'], ['GET', '/children/1/allergies'], ['GET', '/measurements/1'], ['GET', '/alerts'],
  ['GET', '/alerts/1'], ['GET', '/notifications'], ['GET', '/food-items'], ['GET', '/menus/recommendations?child_id=1'],
  ['GET', '/dashboard/summary'], ['GET', '/reports'], ['GET', '/users'], ['POST', '/children'], ['POST', '/reports'], ['POST', '/users'],
  ['DELETE', '/children/1'], ['PATCH', '/children/1/restore'],
];

test('semua endpoint terlindungi menolak permintaan tanpa token', async () => {
  for (const [method, path] of PROTECTED) {
    const r = await call(method, path, { body: method === 'POST' ? {} : undefined });
    assert.equal(r.status, 401, `${method} ${path}`);
  }
});

test('token rusak atau dipalsukan ditolak', async () => {
  for (const token of ['abc.def.ghi', 'bukan-token', `${kader.slice(0, -2)}xx`]) {
    assert.equal((await call('GET', '/auth/me', { token })).status, 401);
  }
});

const KOORDINATOR_ONLY = [
  ['GET', '/users'],
  ['POST', '/users', { name: 'X', email: 'x@x.test', password: '12345678', role: 'kader' }],
  ['PATCH', '/users/1', { name: 'Y' }],
  ['GET', '/dashboard/summary'],
  ['GET', '/reports'],
  ['POST', '/reports', { report_type: 'bulanan', month: '2026-11' }],
  ['GET', '/reports/1/download'],
  ['POST', '/food-items', { name: 'Uji', unit: 'kg', food_group: 'makanan_pokok' }],
  ['POST', '/food-items/1/prices', { price: 1000 }],
  ['PATCH', '/food-items/1', { is_active: true }],
];

test('fungsi koordinator ditolak untuk kader (403) dan tidak ditolak untuk koordinator', async () => {
  for (const [method, path, body] of KOORDINATOR_ONLY) {
    const asKader = await call(method, path, { token: kader, body });
    assert.equal(asKader.status, 403, `kader ${method} ${path}`);
    const asKoord = await call(method, path, { token: koordinator, body });
    assert.notEqual(asKoord.status, 403, `koordinator ${method} ${path}`);
    assert.notEqual(asKoord.status, 401, `koordinator ${method} ${path}`);
  }
});

test('hapus lunak dan pemulihan balita hanya untuk koordinator', async () => {
  const term = `Hapus Uji ${Date.now()}`;
  const created = await call('POST', '/children', {
    token: koordinator,
    body: {
      name: term,
      birth_date: '2024-05-05',
      gender: 'L',
      parent_name: 'Wali Hapus',
      consent: { guardian_name: 'Wali Hapus', notice_version: 'v2' },
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const id = created.json.data.id;

  try {
    assert.equal((await call('DELETE', `/children/${id}`, { token: kader })).status, 403);
    assert.equal((await call('PATCH', `/children/${id}/restore`, { token: kader })).status, 403);
    assert.equal((await call('GET', '/children?status=terhapus', { token: kader })).status, 403);

    const deleted = await call('DELETE', `/children/${id}`, { token: koordinator });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.json.message, 'Balita berhasil dihapus');
    assert.equal(deleted.json.data, null);
    assert.equal((await call('GET', `/children/${id}`, { token: koordinator })).status, 404);
    assert.equal((await call('DELETE', `/children/${id}`, { token: koordinator })).status, 404);

    const trashed = await call('GET', '/children?status=terhapus&limit=100', { token: koordinator });
    assert.equal(trashed.status, 200);
    assert.ok(trashed.json.data.some((c) => c.id === id));

    const restored = await call('PATCH', `/children/${id}/restore`, { token: koordinator });
    assert.equal(restored.status, 200);
    assert.equal(restored.json.data.id, id);
    assert.equal((await call('GET', `/children/${id}`, { token: koordinator })).status, 200);
    assert.equal((await call('PATCH', `/children/${id}/restore`, { token: koordinator })).status, 404);

    const active = await call('GET', '/children?status=terhapus&limit=100', { token: koordinator });
    assert.ok(!active.json.data.some((c) => c.id === id));
  } finally {
    await pool.query('DELETE FROM guardian_consents WHERE child_id = $1', [id]);
    await pool.query('DELETE FROM children WHERE id = $1', [id]);
  }
});

test('data Posyandu lain tidak dapat dibaca atau diubah', async (t) => {
  if (!childId) return t.skip('Tidak ada data balita. Jalankan npm run seed:demo-data');
  const paths = [
    ['GET', `/children/${childId}`], ['GET', `/children/${childId}/measurements`], ['GET', `/children/${childId}/growth`],
    ['GET', `/children/${childId}/allergies`], ['GET', `/children/${childId}/consents`],
    ['GET', `/menus/recommendations?child_id=${childId}`],
    ['PATCH', `/children/${childId}`, { name: 'Diubah' }],
    ['POST', `/children/${childId}/measurements`, { measurement_date: '2026-11-20', weight_kg: 8, height_cm: 70, measurement_type: 'recumbent' }],
  ];
  for (const [method, path, body] of paths) {
    assert.equal((await call(method, path, { token: kaderB, body })).status, 404, `${method} ${path}`);
  }
  for (const [method, path] of [
    ['DELETE', `/children/${childId}`],
    ['PATCH', `/children/${childId}/restore`],
  ]) {
    assert.equal((await call(method, path, { token: koordinatorB })).status, 404, `${method} ${path}`);
  }
  const list = await call('GET', '/children?limit=100', { token: kaderB });
  assert.equal(list.json.data.length, 0, 'daftar balita Posyandu B harus kosong');
  const alerts = await call('GET', '/alerts?limit=100', { token: kaderB });
  assert.equal(alerts.json.data.length, 0, 'daftar peringatan Posyandu B harus kosong');
});

test('akun yang dinonaktifkan langsung kehilangan akses walau token belum kedaluwarsa', async () => {
  const email = `uji.${Date.now()}@demo.test`;
  const created = await call('POST', '/users', { token: koordinator, body: { name: 'Akun Uji', email, password: PASSWORD, role: 'kader' } });
  assert.equal(created.status, 201);
  const token = await login(email);
  assert.equal((await call('GET', '/auth/me', { token })).status, 200);
  const off = await call('PATCH', `/users/${created.json.data.id}`, { token: koordinator, body: { is_active: false } });
  assert.equal(off.status, 200);
  assert.equal((await call('GET', '/auth/me', { token })).status, 401);
});

test('input berbahaya atau aneh pada login tidak menyebabkan galat server', async () => {
  const cases = [
    { body: { email: "' OR '1'='1", password: 'x' }, status: 400 },
    { body: { email: 'kader@demo.test', password: "' OR 1=1 --" }, status: 401 },
    { body: {}, status: 400 },
    { raw: '{bukan json', status: 400 },
  ];
  for (const c of cases) {
    const r = await call('POST', '/auth/login', c);
    assert.equal(r.status, c.status, JSON.stringify(c));
  }
});

test('karakter khusus pada pencarian dan ID tidak valid tidak menyebabkan 500', async () => {
  const q = encodeURIComponent("%'\"\\;--");
  assert.equal((await call('GET', `/children?q=${q}&status=semua&single=true`, { token: kader })).status, 200);
  for (const path of ['/children/abc', '/children/99999999999999999999', '/alerts/xyz', '/measurements/-1']) {
    assert.equal((await call('GET', path, { token: kader })).status, 404, path);
  }
  assert.equal((await call('GET', '/reports/xyz/download', { token: koordinator })).status, 404);
  assert.equal((await call('GET', '/children?page=-1', { token: kader })).status, 400);
});

test('pencarian balita mengembalikan satu hasil terbaik dari semua status', async () => {
  const term = `Budi Uji ${Date.now()}`;
  const consent = { guardian_name: 'Wali Uji', method: 'lisan', notice_version: 'v1' };
  const ids = [];
  for (const name of [`${term} A`, `${term} B`, term]) {
    const created = await call('POST', '/children', {
      token: kader,
      body: { name, birth_date: '2024-01-01', gender: 'L', parent_name: 'Wali Uji', consent },
    });
    assert.equal(created.status, 201, `gagal membuat ${name}`);
    ids.push(created.json.data.id);
  }
  const deactivated = await call('PATCH', `/children/${ids[2]}/status`, { token: kader, body: { status: 'nonaktif' } });
  assert.equal(deactivated.status, 200);

  const encoded = encodeURIComponent(term);
  const single = await call('GET', `/children?q=${encoded}&status=semua&single=true`, { token: kader });
  assert.equal(single.status, 200);
  assert.equal(single.json.data.length, 1);
  assert.equal(single.json.data[0].id, ids[2]);
  assert.equal(single.json.data[0].status, 'nonaktif');
  assert.equal(single.json.meta.total, 1);
  assert.equal(single.json.meta.total_pages, 1);

  const all = await call('GET', `/children?q=${encoded}&status=semua&limit=100`, { token: kader });
  assert.equal(all.status, 200);
  assert.ok(all.json.data.length >= 3);
});

test('RT/RW tersimpan, tampil pada daftar dan detail, dapat diubah, dan dapat difilter', async () => {
  const term = `Wilayah Uji ${Date.now()}`;
  const enc = encodeURIComponent(term);
  const consent = { guardian_name: 'Wali Wilayah', method: 'lisan', notice_version: 'v1' };
  const base = { birth_date: '2024-02-02', gender: 'L', parent_name: 'Wali Wilayah', consent };
  const create = (name, extra = {}) =>
    call('POST', '/children', { token: kader, body: { ...base, name, ...extra } });

  const a = await create(`${term} A`, { rt: '001', rw: '002' });
  const b = await create(`${term} B`, { rt: '001', rw: '003' });
  const c = await create(`${term} C`, { rt: '010', rw: '002' });
  const legacy = await create(`${term} D`);
  for (const r of [a, b, c, legacy]) assert.equal(r.status, 201);
  assert.equal(a.json.data.rt, '001');
  assert.equal(a.json.data.rw, '002');

  const stored = await pool.query('SELECT rt, rw FROM children WHERE id = $1', [a.json.data.id]);
  assert.equal(stored.rows[0].rt, '001');
  assert.equal(stored.rows[0].rw, '002');

  const detail = await call('GET', `/children/${a.json.data.id}`, { token: kader });
  assert.equal(detail.status, 200);
  assert.equal(detail.json.data.rt, '001');
  assert.equal(detail.json.data.rw, '002');

  const list = async (query) => call('GET', `/children?q=${enc}&status=semua&limit=100${query}`, { token: kader });
  const all = await list('');
  assert.equal(all.json.data.length, 4);
  const byRt = await list('&rt=001');
  assert.equal(byRt.json.data.length, 2);
  assert.ok(byRt.json.data.every((row) => row.rt === '001'));
  const byRw = await list('&rw=002');
  assert.equal(byRw.json.data.length, 2);
  assert.ok(byRw.json.data.every((row) => row.rw === '002'));
  const byBoth = await list('&rt=001&rw=002');
  assert.equal(byBoth.json.data.length, 1);
  assert.equal(byBoth.json.data[0].id, a.json.data.id);

  const oldDetail = await call('GET', `/children/${legacy.json.data.id}`, { token: kader });
  assert.equal(oldDetail.json.data.rt, null);
  assert.equal(oldDetail.json.data.rw, null);

  assert.equal((await create(`${term} E`, { rt: 'ABC', rw: '002' })).status, 400);
  assert.equal((await create(`${term} F`, { rt: '0012', rw: '002' })).status, 400);
  assert.equal((await call('PATCH', `/children/${a.json.data.id}`, { token: kader, body: { rt: '1A2' } })).status, 400);
  assert.equal((await call('GET', '/children?rt=abc', { token: kader })).status, 400);
  assert.equal((await call('GET', "/children?rt=001'%20OR%201%3D1--", { token: kader })).status, 400);

  const updated = await call('PATCH', `/children/${a.json.data.id}`, {
    token: kader,
    body: { rt: '002', rw: '004' },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.data.rt, '002');
  assert.equal(updated.json.data.rw, '004');
  const moved = await list('&rt=002&rw=004');
  assert.equal(moved.json.data.length, 1);
  assert.equal(moved.json.data[0].id, a.json.data.id);

  const page1 = await call('GET', `/children?q=${enc}&status=semua&limit=1&page=1`, { token: kader });
  const page2 = await call('GET', `/children?q=${enc}&status=semua&limit=1&page=2`, { token: kader });
  assert.equal(page1.json.data.length, 1);
  assert.equal(page1.json.meta.total, 4);
  assert.equal(page1.json.meta.total_pages, 4);
  assert.equal(page2.json.data.length, 1);
  assert.equal(page2.json.meta.page, 2);
  assert.notEqual(page2.json.data[0].id, page1.json.data[0].id);

  assert.equal((await call('GET', `/children/${a.json.data.id}`, { token: koordinator })).status, 200);
  assert.equal(
    (await call('PATCH', `/children/${a.json.data.id}`, { token: koordinator, body: { rt: '002', rw: '004' } })).status,
    200
  );
});

test('persetujuan baru tersimpan sebagai checklist tanpa memilih metode', async () => {
  const term = `Checklist Uji ${Date.now()}`;
  const created = await call('POST', '/children', {
    token: kader,
    body: {
      name: term,
      birth_date: '2024-04-04',
      gender: 'P',
      parent_name: 'Wali Checklist',
      consent: { guardian_name: 'Wali Checklist', notice_version: 'v2' },
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));

  const id = created.json.data.id;
  const history = await call('GET', `/children/${id}/consents`, { token: kader });
  assert.equal(history.status, 200);
  assert.equal(history.json.data[0].method, 'checklist');

  const withdrawn = await call('POST', `/children/${id}/consents`, {
    token: kader,
    body: { consent_status: 'ditarik', guardian_name: 'Wali Checklist', notice_version: 'v2' },
  });
  assert.equal(withdrawn.status, 201, JSON.stringify(withdrawn.json));
  assert.equal(withdrawn.json.data.method, 'checklist');
});

test('isian terlalu panjang atau terlalu besar ditolak dengan wajar', async () => {
  const long = await call('POST', '/children', {
    token: kader,
    body: { name: 'a'.repeat(1000), gender: 'L', parent_name: 'b', consent: { guardian_name: 'b', method: 'lisan', notice_version: 'v1' } },
  });
  assert.equal(long.status, 400);
  const big = await call('POST', '/auth/login', { raw: JSON.stringify({ email: 'a@b.test', password: 'x'.repeat(300000) }) });
  assert.equal(big.status, 413);
});

test('galat tidak membocorkan jejak tumpukan atau detail teknis', async () => {
  const r = await call('GET', '/tidak-ada');
  assert.equal(r.status, 404);
  assert.equal(r.json.code, 'NOT_FOUND');
  assert.ok(!JSON.stringify(r.json).includes('stack'));
  assert.ok(!JSON.stringify(r.json).includes('node_modules'));
});

test('header keamanan dan CORS', async () => {
  const ok = await fetch(`${BASE}/health`, { headers: { Origin: ORIGIN } });
  assert.equal(ok.headers.get('x-powered-by'), null);
  assert.equal(ok.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(ok.headers.get('access-control-allow-origin'), ORIGIN);
  const evil = await fetch(`${BASE}/health`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
});