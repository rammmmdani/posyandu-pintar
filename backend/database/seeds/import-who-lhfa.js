import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { pool } from "../../src/config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data", "who", "lhfa");

const REFERENCE_VERSION = "who-2006";
const DAYS_PER_MONTH = 30.4375; // 365,25 / 12

// WAJIB diisi dari SUMBER.txt (URL dan tanggal unduh).
const SOURCE =
  "https://www.who.int/tools/child-growth-standards/standards | Tanggal unduh: 21 November 2026";

// pb_u = panjang badan (berbaring), bulan 0-24. tb_u = tinggi badan (berdiri), bulan 24-60.
const DATASETS = [
  {
    indicator: "pb_u",
    gender: "L",
    file: "lhfa_boys_0-to-2-years_zscores.xlsx",
    expectRows: 25,
  },
  {
    indicator: "tb_u",
    gender: "L",
    file: "lhfa_boys_2-to-5-years_zscores.xlsx",
    expectRows: 37,
  },
  {
    indicator: "pb_u",
    gender: "P",
    file: "lhfa_girls_0-to-2-years_zscores.xlsx",
    expectRows: 25,
  },
  {
    indicator: "tb_u",
    gender: "P",
    file: "lhfa_girls_2-to-5-years_zscores.xlsx",
    expectRows: 37,
  },
];

async function readRows(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  // Baca kolom berdasarkan nama header yang di-trim (ada kolom "SD" tambahan dan spasi pada "M").
  const header = {};
  sheet.getRow(1).eachCell((cell, col) => {
    header[String(cell.value).trim()] = col;
  });
  for (const name of ["Month", "L", "M", "S"]) {
    if (!header[name])
      throw new Error(
        `Kolom ${name} tidak ditemukan di ${path.basename(filePath)}`,
      );
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const [month, l, m, s] = ["Month", "L", "M", "S"].map((n) =>
      Number(row.getCell(header[n]).value),
    );
    if ([month, l, m, s].some(Number.isNaN)) {
      throw new Error(
        `Nilai tidak valid di ${path.basename(filePath)} baris ${rowNumber}`,
      );
    }
    rows.push({ ageDays: Math.round(month * DAYS_PER_MONTH), l, m, s });
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
      `DELETE FROM who_growth_references WHERE indicator IN ('pb_u', 'tb_u') AND reference_version = $1`,
      [REFERENCE_VERSION],
    );

    let total = 0;
    for (const { indicator, gender, file, expectRows } of DATASETS) {
      const rows = await readRows(path.join(DATA_DIR, file));
      if (rows.length !== expectRows) {
        throw new Error(
          `${file}: diharapkan ${expectRows} baris, ditemukan ${rows.length}`,
        );
      }
      for (const r of rows) {
        await client.query(
          `INSERT INTO who_growth_references
             (indicator, gender, age_days, l, m, s, reference_version, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            indicator,
            gender,
            r.ageDays,
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
      `Impor selesai: ${total} baris (pb_u dan tb_u, ${REFERENCE_VERSION}).`,
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
