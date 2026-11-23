import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { pool } from "../../src/config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data", "who");

const REFERENCE_VERSION = "who-2006";
const DAYS_PER_MONTH = 30.4375; // 365,25 / 12

// WAJIB diisi dari SUMBER.txt (URL dan tanggal unduh).
const SOURCE =
  "WHO Child Growth Standards - https://www.who.int/tools/child-growth-standards/standards | Tanggal unduh: 21 November 2026";

// key 'value'  : kunci = panjang/tinggi (cm) -> kolom measurement_value
// key 'age'    : kunci = usia (bulan)        -> kolom age_days
// maxMonthExclusive: untuk IMT/U, tabel 0-2 tahun hanya dipakai sampai bulan 23,
//                    bulan 24 diambil dari tabel 2-5 tahun (nilainya berbeda).
const DATASETS = [
  {
    indicator: "bb_pb",
    gender: "L",
    dir: "bb-pb-tb",
    file: "wfl_boys_0-to-2-years_zscores.xlsx",
    keyColumn: "Length",
    key: "value",
    expectRows: 131,
  },
  {
    indicator: "bb_pb",
    gender: "P",
    dir: "bb-pb-tb",
    file: "wfl_girls_0-to-2-years_zscores.xlsx",
    keyColumn: "Length",
    key: "value",
    expectRows: 131,
  },
  {
    indicator: "bb_tb",
    gender: "L",
    dir: "bb-pb-tb",
    file: "wfh_boys_2-to-5-years_zscores.xlsx",
    keyColumn: "Height",
    key: "value",
    expectRows: 111,
  },
  {
    indicator: "bb_tb",
    gender: "P",
    dir: "bb-pb-tb",
    file: "wfh_girls_2-to-5-years_zscores.xlsx",
    keyColumn: "Height",
    key: "value",
    expectRows: 111,
  },
  {
    indicator: "imt_u",
    gender: "L",
    dir: "imt-u",
    file: "bmi_boys_0-to-2-years_zscores.xlsx",
    keyColumn: "Month",
    key: "age",
    maxMonthExclusive: 24,
    expectRows: 24,
  },
  {
    indicator: "imt_u",
    gender: "L",
    dir: "imt-u",
    file: "bmi_boys_2-to-5-years_zscores.xlsx",
    keyColumn: "Month",
    key: "age",
    expectRows: 37,
  },
  {
    indicator: "imt_u",
    gender: "P",
    dir: "imt-u",
    file: "bmi_girls_0-to-2-years_zscores.xlsx",
    keyColumn: "Month",
    key: "age",
    maxMonthExclusive: 24,
    expectRows: 24,
  },
  {
    indicator: "imt_u",
    gender: "P",
    dir: "imt-u",
    file: "bmi_girls_2-to-5-years_zscores.xlsx",
    keyColumn: "Month",
    key: "age",
    expectRows: 37,
  },
];

async function readRows(filePath, keyColumn, maxMonthExclusive) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  // Baca kolom berdasarkan nama header yang di-trim.
  const header = {};
  sheet.getRow(1).eachCell((cell, col) => {
    header[String(cell.value).trim()] = col;
  });
  for (const name of [keyColumn, "L", "M", "S"]) {
    if (!header[name])
      throw new Error(
        `Kolom ${name} tidak ditemukan di ${path.basename(filePath)}`,
      );
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const [k, l, m, s] = [keyColumn, "L", "M", "S"].map((n) =>
      Number(row.getCell(header[n]).value),
    );
    if ([k, l, m, s].some(Number.isNaN)) {
      throw new Error(
        `Nilai tidak valid di ${path.basename(filePath)} baris ${rowNumber}`,
      );
    }
    if (maxMonthExclusive !== undefined && k >= maxMonthExclusive) return;
    rows.push({ k, l, m, s });
  });
  return rows;
}

async function main() {
  if (SOURCE.startsWith("ISI")) {
    throw new Error(
      "Isi konstanta SOURCE dengan URL dan tanggal unduh dari SUMBER.txt",
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Hapus dulu agar skrip aman dijalankan berulang.
    await client.query(
      `DELETE FROM who_growth_references WHERE indicator IN ('bb_pb', 'bb_tb', 'imt_u') AND reference_version = $1`,
      [REFERENCE_VERSION],
    );

    let total = 0;
    for (const d of DATASETS) {
      const rows = await readRows(
        path.join(DATA_DIR, d.dir, d.file),
        d.keyColumn,
        d.maxMonthExclusive,
      );
      if (rows.length !== d.expectRows) {
        throw new Error(
          `${d.file}: diharapkan ${d.expectRows} baris, ditemukan ${rows.length}`,
        );
      }
      for (const r of rows) {
        const ageDays =
          d.key === "age" ? Math.round(r.k * DAYS_PER_MONTH) : null;
        const value = d.key === "value" ? Number(r.k.toFixed(1)) : null;
        await client.query(
          `INSERT INTO who_growth_references
             (indicator, gender, age_days, measurement_value, l, m, s, reference_version, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            d.indicator,
            d.gender,
            ageDays,
            value,
            r.l,
            r.m,
            r.s,
            REFERENCE_VERSION,
            SOURCE,
          ],
        );
        total += 1;
      }
    }

    await client.query("COMMIT");
    console.log(
      `Impor selesai: ${total} baris (bb_pb, bb_tb, imt_u, ${REFERENCE_VERSION}).`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Impor gagal dan dibatalkan:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
