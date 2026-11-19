// Error yang sengaja dilempar aplikasi (bisa ditampilkan ke client).
export class ApiError extends Error {
  constructor(statusCode, code, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}