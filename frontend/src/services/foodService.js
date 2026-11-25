import { api } from "./api";

export async function getFoodItems() {
  const res = await api.get("/food-items");
  return res.data;
}
export async function createFoodItem(payload) {
  const res = await api.post("/food-items", payload);
  return res.data;
}
export async function addFoodPrice(id, payload) {
  const res = await api.post(`/food-items/${id}/prices`, payload);
  return res.data;
}
export async function setFoodActive(id, isActive) {
  const res = await api.patch(`/food-items/${id}`, { is_active: isActive });
  return res.data;
}
