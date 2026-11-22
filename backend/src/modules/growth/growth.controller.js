import * as service from "./growth.service.js";
import * as childrenRepo from "../children/children.repository.js";
import * as measurementRepo from "../measurements/measurements.repository.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendSuccess } from "../../utils/response.js";
import { parseId } from "../../utils/parseId.js";

export async function assessment(req, res) {
  const id = parseId(req.params.id);
  // Pengecekan kepemilikan: pengukuran Posyandu lain dianggap tidak ada.
  const measurement = await measurementRepo.findById(req.user.posyandu_id, id);
  if (!measurement)
    throw new ApiError(404, "NOT_FOUND", "Data pengukuran tidak ditemukan");
  const data = await service.getLatestAssessment(id);
  if (!data)
    throw new ApiError(
      404,
      "NOT_FOUND",
      "Penilaian belum tersedia untuk pengukuran ini",
    );
  sendSuccess(res, { message: "Data berhasil diambil", data });
}

export async function growth(req, res) {
  const childId = parseId(req.params.id);
  const child = await childrenRepo.findById(req.user.posyandu_id, childId);
  if (!child)
    throw new ApiError(404, "NOT_FOUND", "Data balita tidak ditemukan");
  const data = await service.getGrowth(child);
  sendSuccess(res, { message: "Data berhasil diambil", data });
}
