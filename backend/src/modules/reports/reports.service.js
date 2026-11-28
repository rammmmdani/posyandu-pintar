import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/audit.js';
import { resolveReportPeriod } from './period.js';
import { createReportPdf } from './pdf.js';
import * as repo from './reports.repository.js';

const TYPE_LABEL = {
  bulanan: 'Bulanan',
  rekap_6_bulan: 'Rekap 6 bulan',
  kustom: 'Periode khusus',
};

const SEVERITY_LABEL = {
  perlu_perhatian: 'Perlu perhatian',
  perlu_pemeriksaan: 'Perlu pemeriksaan',
  perlu_tindak_lanjut: 'Perlu tindak lanjut',
};

const STATUS_LABEL = {
  baru: 'Baru',
  dilihat: 'Dilihat',
  ditindaklanjuti: 'Ditindaklanjuti',
  ditutup: 'Ditutup',
};

const GENDER_LABEL = { L: 'Laki-laki', P: 'Perempuan' };
const CONSENT_LABEL = { diberikan: 'Ada', ditarik: 'Ditarik', belum_ada: 'Belum ada' };
const MEASUREMENT_TYPE_LABEL = { recumbent: 'Terlentang', standing: 'Berdiri' };
const VALIDITY_LABEL = {
  valid: 'Valid',
  perlu_diperiksa: 'Perlu diperiksa',
  tidak_lengkap: 'Tidak lengkap',
};

const dateOnly = (value) => (value ? String(value).slice(0, 10) : '-');
const generatedAt = () => `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;

function formatAge(months) {
  const value = Number(months);
  if (!Number.isFinite(value)) return 'Belum diketahui';
  if (value < 12) return `${value} bulan`;
  const years = Math.floor(value / 12);
  const rest = value % 12;
  return rest === 0 ? `${years} tahun` : `${years} tahun ${rest} bulan`;
}

function formatNumber(value, digits) {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : '-';
}

function buildPdfInput(source, period, summary) {
  return {
    typeLabel: TYPE_LABEL[source.report_type] || source.report_type,
    period_start: dateOnly(period.period_start),
    period_end: dateOnly(period.period_end),
    generatedAt: generatedAt(),
    summary: {
      activeChildren: summary.active_children,
      measurements: summary.measurements,
      alerts: summary.alerts,
      handledAlerts: summary.handled_alerts,
      rtRows: summary.rt.map((row) => ({
        rt: row.rt,
        rw: row.rw,
        total: row.total,
      })),
      alertRows: summary.alerts_recent.map((row) => ({
        childName: row.child_name,
        severity: SEVERITY_LABEL[row.severity] || row.severity,
        status: STATUS_LABEL[row.status] || row.status,
        date: dateOnly(row.created_date),
      })),
      childRows: summary.children_detail.map((row, index) => ({
        no: index + 1,
        name: row.name,
        gender: GENDER_LABEL[row.gender] || row.gender || '-',
        birthday: dateOnly(row.birth_date),
        age: formatAge(row.age_months),
        rt: row.rt || '-',
        rw: row.rw || '-',
        guardian: row.parent_name,
        consent: CONSENT_LABEL[row.consent_status] || row.consent_status || '-',
      })),
      measurementRows: summary.measurement_rows.map((row, index) => ({
        no: index + 1,
        childName: row.child_name,
        date: dateOnly(row.measurement_date),
        weight: formatNumber(row.weight_kg, 2),
        height: formatNumber(row.height_cm, 1),
        type: MEASUREMENT_TYPE_LABEL[row.measurement_type] || row.measurement_type || '-',
        validity: VALIDITY_LABEL[row.validity_status] || row.validity_status || '-',
      })),
    },
  };
}

export async function listReports(actor, { page, limit }) {
  const { rows, total } = await repo.list(actor.posyandu_id, {
    limit,
    offset: (page - 1) * limit,
  });
  return { rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
}

export async function createReport(actor, input, ip) {
  const period = resolveReportPeriod(input);
  let status = 'selesai';
  let errorMessage = null;

  try {
    const summary = await repo.summary(actor.posyandu_id, period.period_start, period.period_end);
    createReportPdf(buildPdfInput(input, period, summary));
  } catch (err) {
    status = 'gagal';
    errorMessage = String(err.message || 'Gagal membuat laporan').slice(0, 300);
  }

  const id = await repo.insert({
    posyandu_id: actor.posyandu_id,
    created_by: actor.id,
    report_type: input.report_type,
    period_start: period.period_start,
    period_end: period.period_end,
    status,
    error_message: errorMessage,
  });

  await logAudit({
    userId: actor.id,
    action: 'create',
    entityType: 'report',
    entityId: id,
    newData: {
      report_type: input.report_type,
      period_start: period.period_start,
      period_end: period.period_end,
      status,
    },
    ip,
  });

  return repo.findById(actor.posyandu_id, id);
}

export async function downloadReport(actor, id, ip) {
  const report = await repo.findById(actor.posyandu_id, id);
  if (!report) throw new ApiError(404, 'NOT_FOUND', 'Laporan tidak ditemukan');
  if (report.status !== 'selesai') {
    throw new ApiError(
      409,
      'REPORT_NOT_READY',
      report.status === 'gagal'
        ? `Laporan gagal dibuat: ${report.error_message || 'silakan buat ulang'}`
        : 'Laporan masih diproses'
    );
  }

  const summary = await repo.summary(actor.posyandu_id, report.period_start, report.period_end);
  const buffer = createReportPdf(buildPdfInput(report, report, summary));

  await logAudit({
    userId: actor.id,
    action: 'download_report',
    entityType: 'report',
    entityId: id,
    ip,
  });

  return {
    buffer,
    filename: `laporan-posyandu-${dateOnly(report.period_start)}-sd-${dateOnly(report.period_end)}.pdf`,
  };
}
