import { api } from './api';

export async function getAlerts(params = {}) {
  const res = await api.get('/alerts', { params });
  return res.data;
}

export async function getAlert(id) {
  const res = await api.get(`/alerts/${id}`);
  return res.data;
}

export async function updateAlertStatus(id, payload) {
  const res = await api.patch(`/alerts/${id}/status`, payload);
  return res.data;
}

export async function addFollowUp(id, payload) {
  const res = await api.post(`/alerts/${id}/follow-ups`, payload);
  return res.data;
}