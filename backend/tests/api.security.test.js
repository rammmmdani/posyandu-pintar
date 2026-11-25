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

let kader; let koordinator; let kaderB; let childId;

before(async () => {
  // Posyandu kedua dengan satu kader, untuk menguji isolasi data.
  let { rows } = await pool.query("SELECT id FROM posyandus WHERE name = 'Posyandu Uji B'");
  if (!rows[0]) ({ rows } = await pool.query("INSERT INTO posyandus (name) VALUES ('Posyandu Uji B') RETURNING id"));
  const hash = await bcrypt.hash(PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (posyandu_id, name, email, password_hash, role)
     VALUES ($1, 'Kader B', 'kaderb@demo.test', $2, 'kader') ON CONFLICT ((lower(email))) DO NOTHING`,
    [rows[0].id, hash]
  );
  kader = await login('kader@demo.test');
  koordinator = await login('koordinator@demo.test');
  kaderB = await login('kaderb@demo.test');
  const list = await call('GET', '/children?limit=1', { token: kader });
  childId = list.json?.data?.[0]?.id;
});

after(() => pool.end());

const PROTECTED = [
  ['GET', '/auth/me'], ['GET', '/children'], ['GET', '/children/1'], ['GET', '/children/1/measurements'],
  ['GET', '/children/1/growth'], ['GET', '/children/1/allergies'], ['GET', '/measurements/1'], ['GET', '/alerts'],
  ['GET', '/alerts/1'], ['GET', '/notifications'], ['GET', '/food-items'], ['GET', '/menus/recommendations?child_id=1'],
  ['GET', '/dashboard/summary'], ['GET', '/reports'], ['GET', '/users'], ['POST', '/children'], ['POST', '/reports'], ['POST', '/users'],
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
  assert.equal((await call('GET', `/children?q=${q}`, { token: kader })).status, 200);
  for (const path of ['/children/abc', '/children/99999999999999999999', '/alerts/xyz', '/measurements/-1']) {
    assert.equal((await call('GET', path, { token: kader })).status, 404, path);
  }
  assert.equal((await call('GET', '/reports/xyz/download', { token: koordinator })).status, 404);
  assert.equal((await call('GET', '/children?page=-1', { token: kader })).status, 400);
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