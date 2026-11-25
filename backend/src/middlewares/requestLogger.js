// Mencatat metode, jalur, status, dan durasi. Tidak mencatat query string, isi permintaan, atau header,
// agar kata kunci pencarian, kata sandi, dan token tidak masuk log.
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const path = req.originalUrl.split('?')[0];
    console.log(`${new Date().toISOString()} ${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)}ms`);
  });
  next();
}