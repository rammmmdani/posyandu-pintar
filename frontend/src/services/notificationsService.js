import { api } from "./api";

export async function getNotifications(params = {}) {
  const res = await api.get("/notifications", { params });
  return res.data;
}

export async function markNotificationRead(id) {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
}
