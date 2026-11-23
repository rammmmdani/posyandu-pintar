import * as service from "./reports.service.js";
import { sendSuccess } from "../../utils/response.js";
import { parseId } from "../../utils/parseId.js";

export async function create(req, res) {
  const data = await service.createReport(req.user, req.body, req.ip);
  sendSuccess(res, {
    message:
      data.status === "selesai"
        ? "Laporan berhasil dibuat"
        : "Laporan gagal dibuat",
    data,
    status: 201,
  });
}

export async function list(req, res) {
  const { rows, meta } = await service.listReports(
    req.user,
    req.validatedQuery,
  );
  sendSuccess(res, { message: "Data berhasil diambil", data: rows, meta });
}

export async function detail(req, res) {
  sendSuccess(res, {
    message: "Data berhasil diambil",
    data: await service.getReport(req.user, parseId(req.params.id)),
  });
}

export async function download(req, res) {
  const { abs, filename } = await service.getDownload(
    req.user,
    parseId(req.params.id),
    req.ip,
  );
  res.download(abs, filename);
}
