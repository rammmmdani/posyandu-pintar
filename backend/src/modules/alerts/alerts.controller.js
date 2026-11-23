import * as service from "./alerts.service.js";
import * as growthService from "../growth/growth.service.js";
import { sendSuccess } from "../../utils/response.js";
import { parseId } from "../../utils/parseId.js";

export async function list(req, res) {
  const { rows, meta } = await service.listAlerts(req.user, req.validatedQuery);
  sendSuccess(res, { message: "Data berhasil diambil", data: rows, meta });
}

export async function detail(req, res) {
  const alert = await service.getAlert(req.user, parseId(req.params.id));
  const assessment = await growthService.getAssessmentById(alert.assessment_id);
  sendSuccess(res, {
    message: "Data berhasil diambil",
    data: { ...alert, assessment },
  });
}

export async function updateStatus(req, res) {
  const data = await service.updateStatus(
    req.user,
    parseId(req.params.id),
    req.body,
    req.ip,
  );
  sendSuccess(res, { message: "Status peringatan berhasil diperbarui", data });
}

export async function listFollowUps(req, res) {
  const data = await service.listFollowUps(req.user, parseId(req.params.id));
  sendSuccess(res, { message: "Data berhasil diambil", data });
}

export async function addFollowUp(req, res) {
  const data = await service.addFollowUp(
    req.user,
    parseId(req.params.id),
    req.body,
    req.ip,
  );
  sendSuccess(res, {
    message: "Tindak lanjut berhasil dicatat",
    data,
    status: 201,
  });
}
