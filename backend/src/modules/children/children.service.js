import { pool, withTransaction } from '../../config/db.js';
import { MAX_AGE_MONTHS } from '../../config/constants.js';
import { ApiError } from '../../utils/ApiError.js';
import { ageInMonths, todayString } from '../../utils/dates.js';
import { logAudit } from '../../utils/audit.js';
import * as repo from './children.repository.js';
import * as measurementRepo from '../measurements/measurements.repository.js';

function assertBirthDate(birthDate) {
  if (!birthDate) return; // tanggal lahir boleh belum diketahui
  const fail = (message) =>
    new ApiError(400, 'VALIDATION_ERROR', 'Data tidak valid', [{ field: 'birth_date', message }]);
  const today = todayString();
  if (birthDate > today) throw fail('Tanggal lahir tidak boleh di masa depan');
  if (ageInMonths(birthDate, today) > MAX_AGE_MONTHS) {
    throw fail(`Usia balita harus 0 sampai ${MAX_AGE_MONTHS} bulan`);
  }
}

async function getOrFail(user, id) {
  const child = await repo.findById(user.posyandu_id, id);
  if (!child) throw new ApiError(404, 'NOT_FOUND', 'Data balita tidak ditemukan');
  return child;
}

export async function listChildren(user, { page, limit, q, status, single, rt, rw }) {
  if (status === 'terhapus' && user.role !== 'koordinator') {
    throw new ApiError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke data balita yang dihapus');
  }
  const term = q || null;
  const oneResult = Boolean(single && term);
  const effectiveLimit = oneResult ? 1 : limit;
  const effectivePage = oneResult ? 1 : page;
  const { rows, total } = await repo.list(user.posyandu_id, {
    q: term,
    status: status === 'semua' ? null : status,
    limit: effectiveLimit,
    offset: oneResult ? 0 : (page - 1) * limit,
    single: oneResult,
    rt: rt || null,
    rw: rw || null,
  });
  const finalTotal = oneResult ? rows.length : total;
  return {
    rows,
    meta: {
      page: effectivePage,
      limit: effectiveLimit,
      total: finalTotal,
      total_pages: oneResult ? (finalTotal ? 1 : 0) : Math.ceil(total / limit),
    },
  };
}

export async function getChild(user, id) {
  const child = await getOrFail(user, id);

  return {
    ...child,
    latest_measurement: await measurementRepo.findLatestByChild(id),
  };
}

export async function createChild(user, input, ip) {
  assertBirthDate(input.birth_date);

  if (!input.confirm_duplicate) {
    const candidates = await repo.findDuplicates(user.posyandu_id, input);
    if (candidates.length > 0) {
      throw new ApiError(409, 'DUPLICATE_CHILD', 'Kemungkinan balita sudah terdaftar', [], { candidates });
    }
  }

  // Balita dan persetujuan wali disimpan bersama atau tidak sama sekali.
  const childId = await withTransaction(async (db) => {
    const id = await repo.insert(db, { ...input, posyandu_id: user.posyandu_id, created_by: user.id });
    await repo.insertConsent(db, {
      child_id: id,
      consent_status: 'diberikan',
      ...input.consent,
      recorded_by: user.id,
    });
    return id;
  });

  await logAudit({
    userId: user.id,
    action: 'create',
    entityType: 'child',
    entityId: childId,
    newData: { consent: 'diberikan', notice_version: input.consent.notice_version },
    ip,
  });
  return repo.findById(user.posyandu_id, childId);
}

const TRACKED_FIELDS = ['birth_date', 'gender']; // memengaruhi hasil penilaian

export async function updateChild(user, id, input, ip) {
  const before = await getOrFail(user, id);
  if (input.birth_date !== undefined) assertBirthDate(input.birth_date);

  const patch = { ...input };
  for (const key of ['parent_phone', 'address', 'rt', 'rw']) {
    if (patch[key] === '') patch[key] = null;
  }

  await repo.update(user.posyandu_id, id, patch);
  const after = await repo.findById(user.posyandu_id, id);

  const changed = Object.keys(patch).filter((k) => String(before[k] ?? '') !== String(after[k] ?? ''));
  const changedTracked = changed.filter((k) => TRACKED_FIELDS.includes(k));

  // Audit hanya mencatat nama field yang berubah, kecuali data sumber penilaian.
  await logAudit({
    userId: user.id,
    action: 'update',
    entityType: 'child',
    entityId: id,
    oldData: Object.fromEntries(changedTracked.map((k) => [k, before[k]])),
    newData: {
      changed_fields: changed,
      ...Object.fromEntries(changedTracked.map((k) => [k, after[k]])),
    },
    ip,
  });

  const warning = changedTracked.length
    ? 'Penilaian sebelumnya tidak diubah. Tambahkan pengukuran baru atau koreksi pengukuran untuk menghitung ulang.'
    : undefined;
  return { child: after, warning };
}

export async function setChildStatus(user, id, status, ip) {
  const before = await getOrFail(user, id);
  await repo.setStatus(user.posyandu_id, id, status);
  await logAudit({
    userId: user.id,
    action: 'update_status',
    entityType: 'child',
    entityId: id,
    oldData: { status: before.status },
    newData: { status },
    ip,
  });
  return repo.findById(user.posyandu_id, id);
}

export async function deleteChild(user, id, ip) {
  const before = await getOrFail(user, id);
  await repo.softDelete(user.posyandu_id, id);
  await logAudit({
    userId: user.id,
    action: 'delete',
    entityType: 'child',
    entityId: id,
    oldData: { status: before.status },
    newData: { deleted: true },
    ip,
  });
  return null;
}

export async function restoreChild(user, id, ip) {
  const before = await repo.findDeletedById(user.posyandu_id, id);
  if (!before) throw new ApiError(404, 'NOT_FOUND', 'Data balita tidak ditemukan');

  await repo.restore(user.posyandu_id, id);
  await logAudit({
    userId: user.id,
    action: 'restore',
    entityType: 'child',
    entityId: id,
    oldData: { deleted: true },
    newData: { status: before.status },
    ip,
  });
  return repo.findById(user.posyandu_id, id);
}

export async function listConsents(user, id) {
  await getOrFail(user, id);
  return repo.listConsents(id);
}

export async function addConsent(user, id, input, ip) {
  await getOrFail(user, id);

  const consentId = await repo.insertConsent(pool, {
    child_id: id,
    ...input,
    recorded_by: user.id,
  });

  await logAudit({
    userId: user.id,
    action: `consent_${input.consent_status}`,
    entityType: 'guardian_consent',
    entityId: consentId,
    newData: {
      child_id: id,
      method: input.method,
      notice_version: input.notice_version,
    },
    ip,
  });

  return repo.findConsent(consentId);
}