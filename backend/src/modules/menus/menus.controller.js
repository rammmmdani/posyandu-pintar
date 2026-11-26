import { z } from "zod";
import * as service from "./menus.service.js";
import { sendSuccess } from "../../utils/response.js";

export const querySchema = z.object({
  child_id: z.coerce
    .number()
    .int()
    .positive({ message: "child_id wajib diisi" }),
  budget: z.coerce.number().int().min(0).max(10000000).optional(),
});

export async function recommendations(req, res) {
  const { child_id, budget } = req.validatedQuery;
  sendSuccess(res, {
    message: "Data berhasil diambil",
    data: await service.getRecommendations(req.user, child_id, budget),
  });
}
