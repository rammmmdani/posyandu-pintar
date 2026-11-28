const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const CONTENT_BOTTOM = 72;

function ascii(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');
}

function escape(value) {
  return ascii(value).replace(/[\\()]/g, (char) => `\\${char}`);
}

function clip(value, max) {
  const text = ascii(value);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function text(value, x, y, size = 10, font = 'F1') {
  return `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escape(value)}) Tj ET`;
}

function rule(y) {
  return `0.75 w ${MARGIN} ${y} m ${PAGE_WIDTH - MARGIN} ${y} l S`;
}

function tableHeader(columns, y) {
  return columns.map((column) => text(column.label, column.x, y, 8, 'F2')).join('\n');
}

function tableRow(columns, row, y) {
  return columns.map((column) => text(clip(row[column.key], column.max), column.x, y, 8)).join('\n');
}

function makePage() {
  return { commands: [], y: 794 };
}

function put(page, value, x = MARGIN, size = 10, font = 'F1') {
  page.commands.push(text(value, x, page.y, size, font));
}

function drawMainHeader(page, input) {
  put(page, 'LAPORAN POSYANDU', MARGIN, 16, 'F2');
  page.y -= 22;
  put(page, input.typeLabel, MARGIN, 11, 'F2');
  page.y -= 16;
  put(page, `Periode: ${input.period_start} sampai ${input.period_end}`);
  page.y -= 14;
  put(page, `Dibuat: ${input.generatedAt}`);
  page.y -= 16;
  page.commands.push(rule(page.y + 6));
  page.y -= 18;
}

function drawSectionHeader(page, title) {
  put(page, title, MARGIN, 11, 'F2');
  page.y -= 18;
}

function drawContinuationHeader(page, input, title) {
  put(page, 'LAPORAN POSYANDU (lanjutan)', MARGIN, 12, 'F2');
  page.y -= 16;
  put(page, `Periode: ${input.period_start} sampai ${input.period_end}`, MARGIN, 8);
  page.y -= 8;
  page.commands.push(rule(page.y + 4));
  page.y -= 18;
  drawSectionHeader(page, title);
}

function drawTable(state, input, { title, columns, rows, emptyText, rowHeight = 13 }) {
  drawSectionHeader(state.page, title);
  const drawHeader = () => {
    state.page.commands.push(tableHeader(columns, state.page.y));
    state.page.y -= rowHeight + 2;
  };
  drawHeader();

  if (rows.length === 0) {
    put(state.page, emptyText);
    state.page.y -= rowHeight;
    return;
  }

  for (const row of rows) {
    if (state.page.y - rowHeight < CONTENT_BOTTOM) {
      state.page = makePage();
      state.pages.push(state.page);
      drawContinuationHeader(state.page, input, title);
      drawHeader();
    }
    state.page.commands.push(tableRow(columns, row, state.page.y));
    state.page.y -= rowHeight;
  }
}

export function createReportPdf(input) {
  const state = { pages: [makePage()], page: null };
  state.page = state.pages[0];
  drawMainHeader(state.page, input);

  drawSectionHeader(state.page, 'RINGKASAN');
  put(state.page, `Balita aktif: ${input.summary.activeChildren}`);
  state.page.y -= 14;
  put(state.page, `Pengukuran dalam periode: ${input.summary.measurements}`);
  state.page.y -= 14;
  put(state.page, `Peringatan baru: ${input.summary.alerts}`);
  state.page.y -= 14;
  put(state.page, `Peringatan ditindaklanjuti/ditutup: ${input.summary.handledAlerts}`);
  state.page.y -= 22;

  drawTable(state, input, {
    title: 'SEBARAN RT/RW BALITA AKTIF',
    columns: [
      { key: 'rt', label: 'RT', x: MARGIN, max: 8 },
      { key: 'rw', label: 'RW', x: 110, max: 8 },
      { key: 'total', label: 'Jumlah', x: 170, max: 10 },
    ],
    rows: input.summary.rtRows.slice(0, 12),
    emptyText: 'Tidak ada data RT/RW.',
  });

  if (input.summary.rtRows.length > 12) {
    put(state.page, `... dan ${input.summary.rtRows.length - 12} baris lainnya`);
    state.page.y -= 14;
  }
  state.page.y -= 10;

  drawTable(state, input, {
    title: 'PERINGATAN TERBARU',
    columns: [
      { key: 'childName', label: 'Anak', x: MARGIN, max: 25 },
      { key: 'severity', label: 'Tingkat', x: 220, max: 22 },
      { key: 'status', label: 'Status', x: 360, max: 18 },
      { key: 'date', label: 'Tanggal', x: 450, max: 12 },
    ],
    rows: input.summary.alertRows.slice(0, 8),
    emptyText: 'Tidak ada peringatan pada periode ini.',
  });

  state.page = makePage();
  state.pages.push(state.page);
  drawTable(state, input, {
    title: 'DETAIL BALITA YANG DIUKUR',
    columns: [
      { key: 'no', label: 'No', x: MARGIN, max: 4 },
      { key: 'name', label: 'Nama', x: 66, max: 21 },
      { key: 'gender', label: 'JK', x: 161, max: 10 },
      { key: 'birthday', label: 'Lahir', x: 199, max: 12 },
      { key: 'age', label: 'Usia', x: 257, max: 12 },
      { key: 'rt', label: 'RT', x: 319, max: 5 },
      { key: 'rw', label: 'RW', x: 344, max: 5 },
      { key: 'guardian', label: 'Wali', x: 369, max: 20 },
      { key: 'consent', label: 'Setuju', x: 469, max: 14 },
    ],
    rows: input.summary.childRows,
    emptyText: 'Tidak ada balita yang diukur pada periode ini.',
    rowHeight: 13,
  });

  state.page = makePage();
  state.pages.push(state.page);
  drawTable(state, input, {
    title: 'PENGUKURAN DALAM PERIODE',
    columns: [
      { key: 'no', label: 'No', x: MARGIN, max: 4 },
      { key: 'childName', label: 'Anak', x: 66, max: 24 },
      { key: 'date', label: 'Tanggal', x: 190, max: 12 },
      { key: 'weight', label: 'BB kg', x: 260, max: 10 },
      { key: 'height', label: 'TB/PB cm', x: 320, max: 12 },
      { key: 'type', label: 'Tipe', x: 395, max: 12 },
      { key: 'validity', label: 'Validitas', x: 460, max: 16 },
    ],
    rows: input.summary.measurementRows,
    emptyText: 'Tidak ada pengukuran pada periode ini.',
    rowHeight: 13,
  });

  state.pages.forEach((page, index) => {
    page.commands.push(rule(58));
    if (index === 0) {
      page.commands.push(
        text('Data kesehatan anak bersifat sensitif. Bagikan hanya kepada pihak yang berwenang.', MARGIN, 40, 8)
      );
    }
    page.commands.push(text(`Halaman ${index + 1}`, PAGE_WIDTH - MARGIN - 45, 40, 8));
  });

  const pageCount = state.pages.length;
  const f1Ref = 3 + pageCount * 2;
  const f2Ref = f1Ref + 1;
  const kids = Array.from({ length: pageCount }, (_, index) => `${3 + index * 2} 0 R`).join(' ');
  const objects = new Array(f2Ref + 1);

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;

  for (let index = 0; index < pageCount; index += 1) {
    const pageRef = 3 + index * 2;
    const contentRef = pageRef + 1;
    objects[pageRef] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${f1Ref} 0 R /F2 ${f2Ref} 0 R >> >> /Contents ${contentRef} 0 R >>`;
  }

  for (let index = 0; index < pageCount; index += 1) {
    const contentRef = 4 + index * 2;
    const stream = `${state.pages[index].commands.join('\n')}\n`;
    objects[contentRef] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`;
  }

  objects[f1Ref] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[f2Ref] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  let pdf = '%PDF-1.4\n';
  const offsets = new Array(objects.length);
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}
