import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';

const BASE = process.env.API_URL || 'http://localhost:5000/api/v1';
const PASSWORD = process.env.DEMO_PASSWORD || 'Demo12345';
const createdIds = [];
let koordinator;
let kader;

const ascii = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const bytes = Buffer.from(await res.arrayBuffer());
  let json = null;
  try {
    json = JSON.parse(bytes.toString('utf8'));
  } catch {
    json = null;
  }
  return { status: res.status, json, bytes, headers: res.headers, text: bytes.toString('utf8') };
}

async function login(email) {
  const res = await call('POST', '/auth/login', { body: { email, password: PASSWORD } });
  assert.equal(res.status, 200, `login ${email} gagal: ${res.text}`);
  return res.json.data.token;
}

async function createReport(body) {
  const res = await call('POST', '/reports', { token: koordinator, body });
  assert.equal(res.status, 201, res.text);
  assert.equal(res.json.data.status, 'selesai', res.text);
  createdIds.push(res.json.data.id);
  return res.json.data;
}

before(async () => {
  koordinator = await login('koordinator@demo.test');
  kader = await login('kader@demo.test');
});

after(async () => {
  if (createdIds.length) {
    await pool.query(
      'DELETE FROM audit_logs WHERE entity_type = $1 AND entity_id = ANY($2::bigint[])',
      ['report', createdIds]
    );
    await pool.query('DELETE FROM reports WHERE id = ANY($1::bigint[])', [createdIds]);
  }
  await pool.end();
});

test('koordinator dapat membuat laporan dan melihatnya di riwayat', async () => {
  const report = await createReport({ report_type: 'bulanan', month: '2026-11' });
  assert.equal(report.period_start, '2026-11-01');
  assert.equal(report.period_end, '2026-11-30');
  assert.ok(report.created_by && report.created_by.name);

  const list = await call('GET', '/reports?page=1&limit=5', { token: koordinator });
  assert.equal(list.status, 200, list.text);
  assert.ok(list.json.data.some((row) => row.id === report.id));
  assert.ok(list.json.meta.total >= 1);
  assert.equal(list.json.meta.page, 1);
});

test('periode rekap dan kustom dihitung sesuai input', async () => {
  const rekap = await createReport({ report_type: 'rekap_6_bulan', month: '2026-11' });
  assert.equal(rekap.period_start, '2026-06-01');
  assert.equal(rekap.period_end, '2026-11-30');

  const kustom = await createReport({
    report_type: 'kustom',
    period_start: '2026-10-05',
    period_end: '2026-10-20',
  });
  assert.equal(kustom.period_start, '2026-10-05');
  assert.equal(kustom.period_end, '2026-10-20');
});

test('laporan selesai dapat diunduh sebagai PDF', async () => {
  const report = await createReport({ report_type: 'bulanan', month: '2026-09' });
  const res = await call('GET', `/reports/${report.id}/download`, { token: koordinator });
  assert.equal(res.status, 200, res.text);
  assert.match(res.headers.get('content-type'), /application\/pdf/);
  assert.match(res.headers.get('content-disposition'), /attachment/);
  assert.equal(res.bytes.subarray(0, 5).toString(), '%PDF-');
});

test('payload laporan divalidasi', async () => {
  const noMonth = await call('POST', '/reports', { token: koordinator, body: { report_type: 'bulanan' } });
  assert.equal(noMonth.status, 400);
  assert.ok(noMonth.json.errors.some((error) => error.field === 'month'));

  const badRange = await call('POST', '/reports', {
    token: koordinator,
    body: { report_type: 'kustom', period_start: '2026-11-02', period_end: '2026-11-01' },
  });
  assert.equal(badRange.status, 400);
  assert.ok(badRange.json.errors.some((error) => error.field === 'period_end'));

  const badType = await call('POST', '/reports', { token: koordinator, body: { report_type: 'tahunan' } });
  assert.equal(badType.status, 400);
});

test('PDF memuat detail balita dan pengukuran dalam periode', async (t) => {
  const { rows } = await pool.query(
    `SELECT c.name, to_char(m.measurement_date, 'YYYY-MM-DD') AS measurement_date, m.weight_kg
     FROM measurements m
     JOIN children c ON c.id = m.child_id
     JOIN users u ON u.posyandu_id = c.posyandu_id
     WHERE u.email = 'koordinator@demo.test' AND c.deleted_at IS NULL
     ORDER BY m.measurement_date DESC, m.id DESC
     LIMIT 1`
  );
  if (!rows[0]) return t.skip('Tidak ada pengukuran demo');

  const sample = rows[0];
  const report = await createReport({ report_type: 'bulanan', month: sample.measurement_date.slice(0, 7) });
  const res = await call('GET', `/reports/${report.id}/download`, { token: koordinator });
  assert.equal(res.status, 200, res.text);

  const pdfText = res.bytes.toString('latin1');
  assert.ok(pdfText.includes(ascii(sample.name).slice(0, 18)));
  assert.ok(pdfText.includes(sample.measurement_date));
  if (sample.weight_kg !== null) {
    assert.ok(pdfText.includes(Number(sample.weight_kg).toFixed(2)));
  }
});

test('kader tidak dapat mengakses endpoint laporan', async () => {
  assert.equal((await call('GET', '/reports', { token: kader })).status, 403);
  assert.equal((await call('POST', '/reports', { token: kader, body: { report_type: 'bulanan', month: '2026-11' } })).status, 403);
});
