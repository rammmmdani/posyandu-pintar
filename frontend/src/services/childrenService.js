import { api } from './api';
import { childrenListMock } from '../mocks/children';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Semua fungsi mengembalikan body response API apa adanya: { success, message, data, meta? }.
export async function getChildren(params = {}) {
  if (USE_MOCK) return childrenListMock;
  const res = await api.get('/children', { params });
  return res.data;
}

export async function getChild(id) {
  const res = await api.get(`/children/${id}`);
  return res.data;
}

export async function createChild(payload) {
  const res = await api.post('/children', payload);
  return res.data;
}

export async function updateChild(id, payload) {
  const res = await api.patch(`/children/${id}`, payload);
  return res.data;
}

export async function setChildStatus(id, status) {
  const res = await api.patch(`/children/${id}/status`, { status });
  return res.data;
}

export async function getConsents(id) {
  const res = await api.get(`/children/${id}/consents`);
  return res.data;
}

export async function addConsent(id, payload) {
  const res = await api.post(`/children/${id}/consents`, payload);
  return res.data;
}