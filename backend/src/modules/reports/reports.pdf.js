import fs from "node:fs";
import PDFDocument from "pdfkit";
import { RULES_VALIDATED } from "../alerts/alerts.rules.js";

const INK = "#1B2B26";
const MUTED = "#5B6B65";
const NAVY = "#1F3A5F";
const LINE = "#D6E0DA";
const SEVERITY = {
  perlu_perhatian: "Perlu perhatian",
  perlu_pemeriksaan: "Perlu pemeriksaan",
  perlu_tindak_lanjut: "Perlu tindak lanjut",
};
const STATUS = {
  baru: "Baru",
  dilihat: "Dilihat",
  ditindaklanjuti: "Ditindaklanjuti",
  ditutup: "Ditutup",
};
const TYPE = {
  bulanan: "Laporan bulanan",
  rekap_6_bulan: "Rekap enam bulan",
  kustom: "Laporan periode khusus",
};

const fmtDate = (v) => {
  const [y, m, d] = String(v instanceof Date ? v.toISOString() : v)
    .slice(0, 10)
    .split("-");
  return `${d}/${m}/${y}`;
};
const fmtDateTime = (v) =>
  new Date(v).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 3)}...` : s);

// d: { posyandu, report, creator, summary, severity, distribution, alerts, versions }
export function renderReportPdf(filePath, d) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
      info: {
        Title: `${TYPE[d.report.report_type]} ${d.posyandu.name}`,
        Author: "Posyandu Pintar",
      },
    });
    const out = fs.createWriteStream(filePath);
    out.on("finish", resolve);
    out.on("error", reject);
    doc.on("error", reject);
    doc.pipe(out);

    const x0 = doc.page.margins.left;
    const width =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const heading = (text) => {
      doc
        .moveDown(0.9)
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(NAVY)
        .text(text, x0);
      doc.moveDown(0.3).font("Helvetica").fontSize(10).fillColor(INK);
    };

    function table(columns, rows) {
      const xs = [];
      let x = x0;
      for (const c of columns) {
        xs.push(x);
        x += c.width;
      }
      const total = x - x0;
      const heightOf = (cells, bold) => {
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
        return (
          Math.max(
            ...cells.map((t, i) =>
              doc.heightOfString(String(t), { width: columns[i].width - 8 }),
            ),
          ) + 8
        );
      };
      const paint = (cells, header) => {
        const h = heightOf(cells, header);
        if (doc.y + h > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          paint(
            columns.map((c) => c.header),
            true,
          );
        }
        const y = doc.y;
        if (header) doc.rect(x0, y, total, h).fill(NAVY);
        else
          doc.rect(x0, y, total, h).lineWidth(0.5).strokeColor(LINE).stroke();
        cells.forEach((t, i) => {
          doc
            .font(header ? "Helvetica-Bold" : "Helvetica")
            .fontSize(9)
            .fillColor(header ? "#FFFFFF" : INK)
            .text(String(t), xs[i] + 4, y + 4, { width: columns[i].width - 8 });
        });
        doc.x = x0;
        doc.y = y + h;
      };
      paint(
        columns.map((c) => c.header),
        true,
      );
      rows.forEach((r) => paint(r, false));
      doc.moveDown(0.4).fillColor(INK);
    }

    // ---- kepala
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(NAVY)
      .text("Posyandu Pintar", x0);
    doc.fontSize(13).text(TYPE[d.report.report_type]);
    doc.font("Helvetica").fontSize(10).fillColor(INK).moveDown(0.4);
    doc.text(`Posyandu: ${d.posyandu.name}`);
    doc.text(
      `Periode: ${fmtDate(d.report.period_start)} sampai ${fmtDate(d.report.period_end)}`,
    );
    doc.text(
      `Dibuat oleh ${d.creator.name} pada ${fmtDateTime(d.report.created_at)}`,
    );
    doc
      .moveDown(0.5)
      .font("Helvetica-Bold")
      .fillColor("#B42318")
      .text(
        "DOKUMEN RAHASIA. Memuat data kesehatan anak. Jangan dibagikan kepada pihak yang tidak berwenang.",
        { width },
      );
    doc
      .font("Helvetica")
      .fillColor(MUTED)
      .fontSize(9)
      .text(
        "Laporan ini dihasilkan oleh alat bantu pencatatan dan pemantauan. Bukan pengganti penilaian tenaga kesehatan dan bukan diagnosis.",
        { width },
      );
    doc.fillColor(INK).fontSize(10);

    // ---- ringkasan
    heading("1. Ringkasan");
    const s = d.summary;
    table(
      [
        { header: "Ukuran", width: 340 },
        { header: "Jumlah", width: 155 },
      ],
      [
        ["Balita terdaftar hingga akhir periode", s.children_registered],
        ["Balita yang diukur pada periode", s.children_measured],
        ["Pengukuran pada periode", s.measurements],
        ["Peringatan dibuat pada periode", s.alerts_created],
        ["   Perlu perhatian", d.severity.perlu_perhatian],
        ["   Perlu pemeriksaan", d.severity.perlu_pemeriksaan],
        ["   Perlu tindak lanjut", d.severity.perlu_tindak_lanjut],
        ["Tindak lanjut dicatat pada periode", s.follow_ups],
        [
          "Peringatan belum ditangani saat laporan dibuat (baru atau dilihat)",
          s.alerts_unhandled_now,
        ],
      ],
    );

    // ---- distribusi kategori
    heading("2. Distribusi status gizi");
    doc
      .fillColor(MUTED)
      .fontSize(9)
      .text(
        "Berdasarkan pengukuran terakhir setiap balita yang diukur pada periode. Kategori mengikuti Permenkes Nomor 2 Tahun 2020.",
        { width },
      );
    doc.fillColor(INK).fontSize(10);
    for (const ind of d.distribution) {
      doc
        .moveDown(0.5)
        .font("Helvetica-Bold")
        .text(
          `${ind.label}  (${ind.total - ind.unavailable} dari ${ind.total} anak dinilai)`,
        );
      table(
        [
          { header: "Kategori", width: 340 },
          { header: "Jumlah anak", width: 155 },
        ],
        [
          ...ind.items.map((i) => [i.label, i.count]),
          ["Belum dapat dihitung", ind.unavailable],
        ],
      );
    }

    // ---- daftar peringatan
    heading("3. Peringatan pada periode");
    if (d.alerts.length === 0) {
      doc.text("Tidak ada peringatan pada periode ini.");
    } else {
      const totalRows = d.alerts[0].total_rows;
      table(
        [
          { header: "Tanggal", width: 62 },
          { header: "Anak", width: 108 },
          { header: "Peringatan", width: 212 },
          { header: "Tingkat", width: 68 },
          { header: "Status", width: 45 },
        ],
        d.alerts.map((a) => [
          fmtDate(a.created_at),
          a.child_name,
          cut(a.message, 130),
          SEVERITY[a.severity],
          STATUS[a.status],
        ]),
      );
      if (totalRows > d.alerts.length)
        doc
          .fillColor(MUTED)
          .fontSize(9)
          .text(
            `Menampilkan ${d.alerts.length} dari ${totalRows} peringatan, diurut dari tingkat tertinggi.`,
          );
    }

    // ---- catatan
    heading("4. Catatan");
    doc.fontSize(9).fillColor(INK);
    const versions = d.versions.length
      ? d.versions
          .map(
            (v) =>
              `referensi ${v.reference_version}, perhitungan v${v.calculation_version}`,
          )
          .join("; ")
      : "tidak ada penilaian pada periode ini";
    doc.text(`Versi yang dipakai: ${versions}.`, { width });
    doc.text(
      RULES_VALIDATED
        ? "Aturan tingkat peringatan telah ditinjau tenaga kesehatan."
        : "Aturan tingkat peringatan masih contoh dan belum divalidasi tenaga kesehatan.",
      { width },
    );
    doc.text(
      "Data diubah setelah laporan dibuat tidak tercermin di sini. Buat laporan baru untuk data terbaru.",
      { width },
    );

    // ---- nomor halaman
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // agar teks di dasar halaman tidak memicu halaman baru
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          `Halaman ${i + 1} dari ${range.count}`,
          x0,
          doc.page.height - 35,
          { width, align: "center" },
        );
    }
    doc.end();
  });
}
