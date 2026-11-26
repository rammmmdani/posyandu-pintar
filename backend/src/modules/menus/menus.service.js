import { ApiError } from "../../utils/ApiError.js";
import { todayString } from "../../utils/dates.js";
import * as childrenRepo from "../children/children.repository.js";
import * as repo from "./menus.repository.js";
import { recommend } from "./recommend.js";
import {
  AGE_GROUPS,
  GENERAL_NOTES,
  MENU_VALIDATED,
  ageGroupFor,
  guidanceFor,
} from "./guidance.js";

export async function getRecommendations(user, childId, budget) {
  const child = await childrenRepo.findById(user.posyandu_id, childId);
  if (!child)
    throw new ApiError(404, "NOT_FOUND", "Data balita tidak ditemukan");

  const base = {
    child: { id: child.id, name: child.name, age_months: child.age_months },
    is_validated: MENU_VALIDATED,
    budget: budget ?? null,
    notes: GENERAL_NOTES,
    age_group: null,
    guidance: null,
    message: null,
    recommendations: [],
    excluded: [],
  };

  const months = child.age_months;
  if (months === null) {
    return {
      ...base,
      message:
        "Tanggal lahir belum diketahui, sehingga menu sesuai usia tidak dapat ditentukan.",
    };
  }
  const code = ageGroupFor(months);
  if (!code) {
    return {
      ...base,
      message:
        months < 6
          ? "Anak berusia di bawah 6 bulan. Menurut Kemenkes, bayi 0 sampai 6 bulan hanya mengonsumsi ASI dan MPASI dimulai pada usia 6 bulan."
          : "Anak berusia 60 bulan atau lebih, di luar cakupan rekomendasi menu aplikasi ini.",
    };
  }

  const [menus, allergies] = await Promise.all([
    repo.listMenus(code),
    repo.listAllergies(childId),
  ]);
  const result = recommend({
    menus,
    allergies,
    budget: budget ?? null,
    today: todayString(),
    ageLabel: AGE_GROUPS[code].label,
  });
  return {
    ...base,
    age_group: code,
    guidance: guidanceFor(code, months),
    ...result,
  };
}
