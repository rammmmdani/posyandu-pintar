import * as service from "./dashboard.service.js";
import { sendSuccess } from "../../utils/response.js";

export async function summary(req, res) {
  sendSuccess(res, {
    message: "Data berhasil diambil",
    data: await service.getSummary(req.user),
  });
}
