import { api } from './api';

export async function getRecommendations(childId, budget) {
  const res = await api.get('/menus/recommendations', { params: { child_id: childId, budget: budget ?? undefined } });
  return res.data;
}

export async function getAllergies(childId) {
  const res = await api.get(`/children/${childId}/allergies`);
  return res.data;
}

export async function saveAllergies(childId, items) {
  const res = await api.put(`/children/${childId}/allergies`, { items });
  return res.data;
}

export async function getFoodItems() {
  const res = await api.get('/food-items');
  return res.data;
}