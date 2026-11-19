import axios from "axios";

// Instance axios tunggal untuk seluruh aplikasi.
// Token login akan ditambahkan di sini saat fitur auth dibuat.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});
