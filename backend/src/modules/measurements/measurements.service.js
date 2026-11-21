import { ApiError } from '../../utils/ApiError.js';
import { todayString } from '../../utils/dates.js';
import { logAudit } from '../../utils/audit.js';
import { PROVISIONAL_LIMITS } from '../../config/measurementLimits.js';
import * as childrenRepo from '../children/children.repository.js';
import * as growthService from '../growth/growth.service.js';
import { checkCombination } from './measurements.schema.js';
import * as repo from './measurements.repository.js';

const validationError = (issues) =>
  new ApiError(400, 'VALIDATION_ERROR', 'Data tidak valid', issues);

async function getChildOrFail(user, childId) {
  const child = await childrenRepo.findById(user.posyandu_id, childId);
  if (!child) throw new ApiError(404, 'NOT_FOUND', 'Data balita tidak ditemukan');
  return child;
}

function assertConsent(child) {
  // Asumsi tim (perlu dikonfirmasi pihak yang memahami pelindungan data).
  if (child.consent_status === 'ditarik') {
    throw new ApiError(
      403,
      'CONSENT_WITHDRAWN',
      'Persetujuan wali telah ditarik. Pengukuran baru tidak dapat dicatat.'
    );
  }
}

function assertDate(child, date) {
  if (date > todayString()) {
    throw validationError([{ field: 'measurement_date', message: 'Tanggal pengukuran tidak boleh di masa depan' }]);
  }
  if (child.birth_date && date < child.birth_date) {
    throw validationError([{ field: 'measurement_date', message: 'Tanggal pengukuran tidak boleh sebelum tanggal lahir' }]);
  }
}

// Data di luar batas sementara ditandai untuk diperiksa. Data tidak lengkap ditandai terpisah.
function judgeValidity({ weight_kg, height_cm }) {
  const outside = (v, { min, max }) => v !== null && (v < min || v > max);
  if (outside(weight_kg, PROVISIONAL_LIMITS.weight_kg) || outside(height_cm, PROVISIONAL_LIMITS.height_cm)) {
    return 'perlu_diperiksa';
  }
  if (weight_kg === null || height_cm === null) return 'tidak_lengkap';
  return 'valid';
}

// Penilaian gagal tidak boleh menghilangkan data yang sudah diinput kader.
async function assessSafely(child, measurement) {
  try {
    const { assessment, alerts } = await growthService.assessMeasurement({ child, measurement });
    return { assessment, alerts, warning: undefined };
  } catch (err) {
    console.error('Penilaian gagal:', err);
    return {
      assessment: null,
      alerts: [],
      warning: 'Pengukuran tersimpan, tetapi penilaian belum dapat dihitung. Hubungi pengelola aplikasi.',
    };
  }
}

export async function listMeasurements(user, childId, { page, limit, order }) {
  await getChildOrFail(user, childId);
  const { rows, total } = await repo.listByChild(childId, { limit, offset: (page - 1) * limit, order });
  return { rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
}

export async function getMeasurement(user, id) {
  const measurement = await repo.findById(user.posyandu_id, id);
  if (!measurement) throw new ApiError(404, 'NOT_FOUND', 'Data pengukuran tidak ditemukan');
  const assessment = await growthService.getLatestAssessment(id);
  return { ...measurement, assessment };
}

export async function createMeasurement(user, childId, input, ip) {
  const child = await getChildOrFail(user, childId);
  assertConsent(child);
  assertDate(child, input.measurement_date);

  if (await repo.findDuplicate(childId, input)) {
    throw new ApiError(409, 'DUPLICATE_MEASUREMENT', 'Pengukuran yang sama sudah tercatat pada tanggal ini');
  }

  const validity_status = judgeValidity(input);
  const id = await repo.insert({ ...input, child_id: childId, measured_by: user.id, validity_status });
  const measurement = await repo.findById(user.posyandu_id, id);

  await logAudit({
    userId: user.id,
    action: 'create',
    entityType: 'measurement',
    entityId: id,
    newData: {
      child_id: childId,
      measurement_date: input.measurement_date,
      weight_kg: input.weight_kg,
      height_cm: input.height_cm,
      validity_status,
    },
    ip,
  });

  const { assessment, alerts, warning } = await assessSafely(child, measurement);
  return { data: { measurement, assessment, alerts }, warning };
}

export async function updateMeasurement(user, id, input, ip) {
  const current = await repo.findById(user.posyandu_id, id);
  if (!current) throw new ApiError(404, 'NOT_FOUND', 'Data pengukuran tidak ditemukan');

  const child = await getChildOrFail(user, current.child_id);
  assertConsent(child);

  if (input.version !== current.version) {
    throw new ApiError(409, 'VERSION_CONFLICT', 'Data sudah diubah pengguna lain. Muat ulang lalu coba lagi.');
  }

  const { version, ...patch } = input;
  const merged = {
    measurement_date: patch.measurement_date ?? current.measurement_date,
    weight_kg: patch.weight_kg !== undefined ? patch.weight_kg : current.weight_kg,
    height_cm: patch.height_cm !== undefined ? patch.height_cm : current.height_cm,
    measurement_type: patch.measurement_type !== undefined ? patch.measurement_type : current.measurement_type,
    notes: patch.notes !== undefined ? patch.notes : current.notes,
  };

  const issues = checkCombination(merged);
  if (issues.length) throw validationError(issues);
  assertDate(child, merged.measurement_date);

  if (await repo.findDuplicate(current.child_id, merged, id)) {
    throw new ApiError(409, 'DUPLICATE_MEASUREMENT', 'Pengukuran yang sama sudah tercatat pada tanggal ini');
  }

  const validity_status = judgeValidity(merged);
  const ok = await repo.updateVersioned(id, version, { ...merged, validity_status });
  if (!ok) {
    throw new ApiError(409, 'VERSION_CONFLICT', 'Data sudah diubah pengguna lain. Muat ulang lalu coba lagi.');
  }

  const measurement = await repo.findById(user.posyandu_id, id);

  // Riwayat perubahan pengukuran wajib dapat ditelusuri (PRD 7.1).
  await logAudit({
    userId: user.id,
    action: 'update',
    entityType: 'measurement',
    entityId: id,
    oldData: {
      measurement_date: current.measurement_date,
      weight_kg: current.weight_kg,
      height_cm: current.height_cm,
      measurement_type: current.measurement_type,
      version: current.version,
    },
    newData: {
      measurement_date: measurement.measurement_date,
      weight_kg: measurement.weight_kg,
      height_cm: measurement.height_cm,
      measurement_type: measurement.measurement_type,
      version: measurement.version,
    },
    ip,
  });

  const { assessment, alerts, warning } = await assessSafely(child, measurement);
  return { data: { measurement, assessment, alerts }, warning };
}