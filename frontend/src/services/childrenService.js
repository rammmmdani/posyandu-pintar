import { api } from './api';
import { childrenListMock } from '../mocks/children';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export async function getChildren(params) {
  if (USE_MOCK) return childrenListMock; // bentuk sama dengan response API
  const res = await api.get('/children', { params });
  return res.data;
}