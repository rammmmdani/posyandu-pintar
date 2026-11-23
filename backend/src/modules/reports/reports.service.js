import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ApiError } from "../../utils/ApiError.js";
import { logAudit } from "../../utils/audit.js";
import * as repo from "./reports.repository.js";
import * as dashboardRepo from "../dashboard/dashboard.repository.js";
import { buildDistribution } from "../dashboard/stats.js";
import { renderReportPdf } from "./reports.pdf.js";
import { resolvePeriod, daysBetween } from "./period.js";

// backend/storage/reports (di luar direktori publik, dan sudah ada di .gitignore)
const STORAGE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../storage/reports",
);
const MAX_ALERT_ROWS = 60;
const MAX_DAYS = 366;

const bad = (field, message) =>
  new ApiError(400, "VALIDATION_ERROR", "Data tidak valid", [
    { field, message },
  ]);

const toReport = (r) => ({
  id: r.id,
  report_type: r.report_type,
  period_start: r.period_start,
  period_end: r.period_end,
  status: r.status,
  error_message: r.error_message,
  created_by: r.created_by,
  created_at: r.created_at,
});

async function collect(user, report, creator) {
  const pid = user.posyandu_id;
  const from = report.period_start;
  const to = report.period_end;
  const [posyandu, summary, severity, latest, alerts, versions] =
    await Promise.all([
      dashboardRepo.posyandu(pid),
      repo.summaryFor(pid, from, to),
      repo.severityFor(pid, from, to),
      dashboardRepo.latestAssessments(pid, { from, to }),
      repo.alertsFor(pid, from, to, MAX_ALERT_ROWS),
      repo.versionsFor(pid, from, to),
    ]);
  return {
    posyandu,
    report,
    creator,
    summary,
    severity,
    distribution: buildDistribution(latest),
    alerts,
    versions,
  };
}

export async function createReport(user, input, ip) {
  const { start, end } = resolvePeriod(input);
  if (end < start)
    throw bad("period_end", "Tanggal akhir tidak boleh sebelum tanggal mulai");
  if (daysBetween(start, end) > MAX_DAYS)
    throw bad("period_end", "Periode laporan maksimal 12 bulan");

  const id = await repo.insert({
    posyandu_id: user.posyandu_id,
    created_by: user.id,
    report_type: input.report_type,
    period_start: start,
    period_end: end,
  });

  try {
    const report = await repo.findById(user.posyandu_id, id);
    const rel = path.join(String(user.posyandu_id), `laporan-${id}.pdf`);
    const abs = path.join(STORAGE_DIR, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await renderReportPdf(
      abs,
      await collect(user, report, { id: user.id, name: user.name }),
    );
    await repo.markDone(id, rel);
  } catch (err) {
    console.error("Pembuatan laporan gagal:", err);
    await repo.markFailed(
      id,
      `Gagal membuat berkas: ${String(err.message).slice(0, 200)}`,
    );
  }

  await logAudit({
    userId: user.id,
    action: "create",
    entityType: "report",
    entityId: id,
    newData: {
      report_type: input.report_type,
      period_start: start,
      period_end: end,
    },
    ip,
  });
  return toReport(await repo.findById(user.posyandu_id, id));
}

export async function listReports(user, { page, limit }) {
  const { rows, total } = await repo.list(user.posyandu_id, {
    limit,
    offset: (page - 1) * limit,
  });
  return {
    rows: rows.map(toReport),
    meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

export async function getReport(user, id) {
  const r = await repo.findById(user.posyandu_id, id);
  if (!r) throw new ApiError(404, "NOT_FOUND", "Laporan tidak ditemukan");
  return toReport(r);
}

export async function getDownload(user, id, ip) {
  const r = await repo.findById(user.posyandu_id, id);
  if (!r) throw new ApiError(404, "NOT_FOUND", "Laporan tidak ditemukan");
  if (r.status !== "selesai" || !r.private_file_path)
    throw new ApiError(404, "NOT_FOUND", "Berkas laporan belum tersedia");

  const abs = path.resolve(STORAGE_DIR, r.private_file_path);
  if (!abs.startsWith(STORAGE_DIR + path.sep))
    throw new ApiError(404, "NOT_FOUND", "Berkas laporan tidak ditemukan"); // jaga dari path traversal
  try {
    await fs.access(abs);
  } catch {
    throw new ApiError(
      404,
      "NOT_FOUND",
      "Berkas laporan tidak ditemukan. Buat laporan ulang.",
    );
  }

  await logAudit({
    userId: user.id,
    action: "download_report",
    entityType: "report",
    entityId: id,
    ip,
  });
  return {
    abs,
    filename: `laporan-posyandu-${String(r.period_start).slice(0, 10)}-sd-${String(r.period_end).slice(0, 10)}.pdf`,
  };
}
