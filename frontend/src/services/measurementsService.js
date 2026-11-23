import { api } from './api';

export async function getMeasurements(childId, params = {}) {
  const res = await api.get(`/children/${childId}/measurements`, { params });
  return res.data;
}

export async function createMeasurement(childId, payload) {
  const res = await api.post(`/children/${childId}/measurements`, payload);
  return res.data;
}