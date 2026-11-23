import { api } from './api';

export async function getReports(params = {}) {
  const res = await api.get('/reports', { params });
  return res.data;
}

export async function createReport(payload) {
  const res = await api.post('/reports', payload);
  return res.data;
}

// Berkas diminta lewat API terproteksi (butuh token), lalu disimpan sebagai unduhan.
export async function downloadReport(id, filename) {
  try {
    const res = await api.get(`/reports/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    // Pada responseType blob, isi galat juga berupa Blob. Ubah dulu agar pesan server terbaca.
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch {
        /* biarkan apa adanya */
      }
    }
    throw err;
  }
}