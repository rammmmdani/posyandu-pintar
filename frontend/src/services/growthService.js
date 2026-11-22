import { api } from "./api";
import { growthMock } from "../mocks/growth";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export async function getGrowth(childId) {
  if (USE_MOCK) return growthMock;
  const res = await api.get(`/children/${childId}/growth`);
  return res.data;
}

export async function getAssessment(measurementId) {
  const res = await api.get(`/measurements/${measurementId}/assessment`);
  return res.data;
}
