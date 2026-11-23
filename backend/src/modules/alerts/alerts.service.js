import { ApiError } from "../../utils/ApiError.js";
import { logAudit } from "../../utils/audit.js";
import { todayString } from "../../utils/dates.js";
import { buildAlerts, RULES_VALIDATED } from "./alerts.rules.js";
import * as repo from "./alerts.repository.js";

const bad = (field, message) =>
  new ApiError(400, "VALIDATION_ERROR", "Data tidak valid", [
    { field, message },
  ]);

export const toAlert = (r) => ({
  id: r.id,
  child: { id: r.child_id, name: r.child_name },
  assessment_id: r.assessment_id,
  type: r.type,
  severity: r.severity,
  message: r.message,
  recommendation: r.recommendation,
  status: r.status,
  status_note: r.status_note,
  is_validated: RULES_VALIDATED,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

// Dipanggil oleh modul penilaian setiap kali sebuah penilaian dibuat.
export async function createAlertsForAssessment({
  child,
  measurement,
  assessment,
}) {
  // Peringatan terbuka dari penilaian lama (sebelum koreksi) digantikan oleh yang baru.
  const closed = await repo.supersedeOpen(
    measurement.id,
    assessment.id,
    "Digantikan oleh penilaian baru setelah koreksi pengukuran",
  );
  for (const id of closed) {
    await logAudit({
      action: "auto_close",
      entityType: "alert",
      entityId: id,
      newData: { reason: "superseded", measurement_id: measurement.id },
    });
  }

  const ids = [];
  for (const a of buildAlerts(assessment)) {
    const id = await repo.insert({
      child_id: child.id,
      assessment_id: assessment.id,
      ...a,
    });
    if (id) {
      ids.push(id);
      await logAudit({
        action: "create",
        entityType: "alert",
        entityId: id,
        newData: {
          type: a.type,
          severity: a.severity,
          assessment_id: assessment.id,
        },
      });
    }
  }
  if (ids.length === 0) return [];
  await repo.notify(ids);
  return (await repo.findManyByIds(ids)).map(toAlert);
}

// Dipakai bila pengukuran ditandai "perlu diperiksa" setelah koreksi: tidak ada nilai valid lagi.
export async function closeAlertsForMeasurement(measurementId) {
  const closed = await repo.supersedeOpen(
    measurementId,
    0,
    "Pengukuran ditandai perlu diperiksa setelah koreksi",
  );
  for (const id of closed) {
    await logAudit({
      action: "auto_close",
      entityType: "alert",
      entityId: id,
      newData: { reason: "measurement_flagged", measurement_id: measurementId },
    });
  }
}

async function getOrFail(user, id) {
  const alert = await repo.findById(user.posyandu_id, id);
  if (!alert)
    throw new ApiError(404, "NOT_FOUND", "Peringatan tidak ditemukan");
  return alert;
}

export async function listAlerts(
  user,
  { page, limit, status, severity, child_id },
) {
  const { rows, total } = await repo.list(user.posyandu_id, {
    status: status ?? null,
    severity: severity ?? null,
    childId: child_id ?? null,
    limit,
    offset: (page - 1) * limit,
  });
  return {
    rows: rows.map(toAlert),
    meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

export async function getAlert(user, id) {
  const alert = await getOrFail(user, id);
  return { ...toAlert(alert), follow_ups: await repo.listFollowUps(id) };
}

// Transisi manual yang diizinkan (status tujuan -> status asal yang boleh).
const TRANSITIONS = {
  dilihat: ["baru", "ditutup"], // ditutup -> dilihat = membuka kembali
  ditutup: ["baru", "dilihat", "ditindaklanjuti"],
};

export async function updateStatus(user, id, { status, note }, ip) {
  const alert = await getOrFail(user, id);
  if (!TRANSITIONS[status].includes(alert.status)) {
    throw bad(
      "status",
      `Status tidak dapat diubah dari "${alert.status}" menjadi "${status}"`,
    );
  }
  await repo.updateStatus(
    user.posyandu_id,
    id,
    status,
    status === "ditutup" ? note : null,
  );
  await logAudit({
    userId: user.id,
    action: "update_status",
    entityType: "alert",
    entityId: id,
    oldData: { status: alert.status },
    newData: { status, has_note: Boolean(note) },
    ip,
  });
  return toAlert(await getOrFail(user, id));
}

export async function listFollowUps(user, id) {
  await getOrFail(user, id);
  return repo.listFollowUps(id);
}

export async function addFollowUp(user, id, input, ip) {
  const alert = await getOrFail(user, id);
  if (alert.status === "ditutup")
    throw bad(
      "status",
      "Peringatan sudah ditutup. Buka kembali sebelum menambah tindak lanjut.",
    );
  if (input.action_date > todayString())
    throw bad("action_date", "Tanggal tindakan tidak boleh di masa depan");

  const followUpId = await repo.insertFollowUp({
    alert_id: id,
    recorded_by: user.id,
    ...input,
  });
  if (alert.status === "baru" || alert.status === "dilihat") {
    await repo.updateStatus(user.posyandu_id, id, "ditindaklanjuti", null);
  }
  await logAudit({
    userId: user.id,
    action: "create",
    entityType: "follow_up",
    entityId: followUpId,
    newData: { alert_id: id, referral_status: input.referral_status },
    ip,
  });
  return repo.findFollowUp(followUpId);
}
