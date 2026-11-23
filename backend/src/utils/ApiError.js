// Error yang sengaja dilempar aplikasi (boleh ditampilkan ke client).
export class ApiError extends Error {
  constructor(statusCode, code, message, errors = [], data = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.data = data;
  }
}