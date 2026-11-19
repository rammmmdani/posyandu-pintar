import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { pool } from "../../src/config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, "..", "data", "who", "bb-u");

const INDICATOR = "bb_u";
const REFERENCE_VERSION = "who-2006";
const DAYS_PER_MONTH = 30.4375;

const SOURCE =
  "WHO Child Growth Standards 2006; " +
  "https://www.who.int/tools/child-growth-standards/standards/weight-for-age; " +
  "downloaded 2026-11-19";

const FILES = [
  {
    gender: "L",
    file: "wfa_boys_0-to-5-years_zscores.xlsx",
  },
  {
    gender: "P",
    file: "wfa_girls_0-to-5-years_zscores.xlsx",
  },
];

async function readRows(filePath, gender) {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(filePath);
  } catch (error) {
    if (error.code === "ENOENT" || error.message?.includes("File not found")) {
      throw new Error(`File Excel tidak ditemukan: ${filePath}`);
    }

    throw new Error(`Gagal membaca file Excel: ${error.message}`);
  }

  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new Error(`Worksheet tidak ditemukan: ${filePath}`);
  }

  const header = [1, 2, 3, 4].map((i) =>
    String(sheet.getRow(1).getCell(i).value ?? "").trim(),
  );

  if (header.join(",") !== "Month,L,M,S") {
    throw new Error(
      `Header tidak sesuai di ${path.basename(filePath)}. ` +
        `Diharapkan: Month,L,M,S. Ditemukan: ${header.join(",")}`,
    );
  }

  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const values = [1, 2, 3, 4].map((i) => row.getCell(i).value);

    if (values.every((value) => value == null || value === "")) {
      return;
    }

    const [month, l, m, s] = values.map(Number);

    if (
      !Number.isInteger(month) ||
      month < 0 ||
      month > 60 ||
      !Number.isFinite(l) ||
      !Number.isFinite(m) ||
      !Number.isFinite(s)
    ) {
      throw new Error(
        `Data tidak valid di ${path.basename(filePath)}, baris ${rowNumber}`,
      );
    }

    rows.push({
      gender,
      ageDays: Math.round(month * DAYS_PER_MONTH),
      l,
      m,
      s,
    });
  });

  if (rows.length !== 61) {
    throw new Error(
      `${path.basename(filePath)} seharusnya memiliki 61 baris, ` +
        `ditemukan ${rows.length}`,
    );
  }

  return rows;
}

async function main() {
  let client;
  let transactionStarted = false;

  try {
    console.log("Memulai import data WHO BB/U...\n");

    const allRows = [];

    for (const file of FILES) {
      console.log(`Membaca ${file.file}...`);

      const rows = await readRows(path.join(DATA_DIR, file.file), file.gender);

      allRows.push(...rows);

      console.log(`${file.gender}: ${rows.length} baris terbaca.`);
    }

    console.log(`\nTotal data siap diimport: ${allRows.length}`);

    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    const insertQuery = `
      INSERT INTO who_growth_references
        (indicator, gender, age_days, l, m, s, reference_version, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
    `;

    let inserted = 0;
    let skipped = 0;

    for (const row of allRows) {
      const result = await client.query(insertQuery, [
        INDICATOR,
        row.gender,
        row.ageDays,
        row.l,
        row.m,
        row.s,
        REFERENCE_VERSION,
        SOURCE,
      ]);

      if (result.rowCount === 1) {
        inserted++;
      } else {
        skipped++;
      }
    }

    await client.query("COMMIT");
    transactionStarted = false;

    console.log("\nImport WHO BB/U selesai.");
    console.log(`Total data dibaca : ${allRows.length}`);
    console.log(`Data dimasukkan   : ${inserted}`);
    console.log(`Data dilewati     : ${skipped}`);
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
        console.error("Transaksi database dibatalkan.");
      } catch (rollbackError) {
        console.error("Rollback gagal:", rollbackError.message);
      }
    }

    console.error("\nImport gagal:");

    switch (error.code) {
      case "28P01":
        console.error("Autentikasi database gagal.");
        console.error("Periksa username dan password DATABASE_URL.");
        break;

      case "ECONNREFUSED":
        console.error("Database tidak dapat dihubungi.");
        console.error("Periksa alamat dan port database.");
        break;

      case "42P01":
        console.error("Tabel who_growth_references belum tersedia.");
        break;

      case "23505":
        console.error("Terjadi konflik data unik pada database.");
        break;

      default:
        console.error(error.message);
    }

    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }

    await pool.end();
  }
}

main();
