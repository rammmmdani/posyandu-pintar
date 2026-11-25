import { api } from "./api";

export async function getUsers(params = {}) {
  const res = await api.get("/users", { params });
  return res.data;
}
export async function createUser(payload) {
  const res = await api.post("/users", payload);
  return res.data;
}
export async function updateUser(id, payload) {
  const res = await api.patch(`/users/${id}`, payload);
  return res.data;
}
