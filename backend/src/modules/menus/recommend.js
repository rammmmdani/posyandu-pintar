import {
  FOOD_GROUPS,
  EXTRA_GROUP,
  PRICE_STALE_DAYS,
} from "../../config/food.js";
import { daysBetween } from "../reports/period.js";

const ANIMAL_GROUPS = ["daging_dagingan", "telur", "produk_susu"];
const DIVISORS = { "g>kg": 1000, "ml>l": 1000 };

export const rupiah = (n) =>
  `Rp ${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

// Biaya satu baris bahan. null bila harga tidak ada atau satuan tidak dapat dikonversi.
export function lineCost(quantity, unit, priceUnit, price) {
  if (price === null || price === undefined) return null;
  if (unit === priceUnit) return quantity * price;
  const divisor = DIVISORS[`${unit}>${priceUnit}`];
  return divisor ? (quantity / divisor) * price : null;
}

function exclusionReason(menu, allergies) {
  for (const ing of menu.ingredients) {
    for (const a of allergies) {
      if (a.food_item_id && a.food_item_id === ing.food_item_id) {
        return `Mengandung ${ing.name}, yang ditandai sebagai alergi atau pantangan`;
      }
      if (a.allergen_tag && ing.allergen_tags.includes(a.allergen_tag)) {
        return `Mengandung ${ing.name} (${a.allergen_tag}), yang ditandai sebagai alergi atau pantangan`;
      }
    }
    if (!ing.is_active) return `Bahan ${ing.name} sedang tidak tersedia`;
  }
  return null;
}

function analyse(menu, today) {
  let total = 0;
  let complete = true;
  let oldest = null;
  const missing = [];
  const lines = menu.ingredients.map((ing) => {
    const cost = lineCost(ing.quantity, ing.unit, ing.item_unit, ing.price);
    if (cost === null) {
      complete = false;
      missing.push(ing.name);
    } else {
      total += cost;
    }
    if (ing.price_date && (oldest === null || ing.price_date < oldest))
      oldest = ing.price_date;
    return {
      food_item_id: ing.food_item_id,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      food_group: ing.food_group,
      cost: cost === null ? null : Math.round(cost),
      price_date: ing.price_date ?? null,
    };
  });
  const groups = [...new Set(menu.ingredients.map((i) => i.food_group))].filter(
    (g) => g !== EXTRA_GROUP && FOOD_GROUPS[g],
  );
  return {
    lines,
    total: Math.round(total),
    complete,
    missing,
    oldest,
    stale: oldest !== null && daysBetween(oldest, today) > PRICE_STALE_DAYS,
    groups,
  };
}

// menus: [{ id, name, age_group, serving_info, ingredients: [{ food_item_id, name, quantity, unit, item_unit,
//          food_group, allergen_tags, is_active, price, price_date }] }]
// allergies: [{ food_item_id, allergen_tag }]. budget: rupiah per porsi atau null. today: YYYY-MM-DD.
export function recommend({ menus, allergies, budget, today, ageLabel }) {
  const recommendations = [];
  const excluded = [];

  for (const menu of menus) {
    const ref = { id: menu.id, name: menu.name };

    const reason = exclusionReason(menu, allergies);
    if (reason) {
      excluded.push({ menu: ref, reason });
      continue;
    }

    const a = analyse(menu, today);
    const hasBudget = budget !== null && budget !== undefined;
    if (hasBudget && a.complete && a.total > budget) {
      excluded.push({
        menu: ref,
        reason: `Perkiraan biaya ${rupiah(a.total)} melebihi anggaran ${rupiah(budget)} per porsi`,
      });
      continue;
    }

    const animal = a.groups.filter((g) => ANIMAL_GROUPS.includes(g));
    const reasons = [`Sesuai kelompok usia ${ageLabel}.`];
    reasons.push(
      `Memuat ${a.groups.length} kelompok pangan: ${a.groups.map((g) => FOOD_GROUPS[g]).join(", ")}.`,
    );
    if (animal.length) {
      reasons.push(
        "Mengandung protein hewani, yang menurut Kemenkes berkaitan dengan risiko stunting yang lebih rendah.",
      );
    }
    if (!a.complete)
      reasons.push(
        `Perkiraan biaya belum lengkap karena harga ${a.missing.join(", ")} belum tersedia.`,
      );
    else if (hasBudget)
      reasons.push(
        `Perkiraan biaya ${rupiah(a.total)} per porsi, dalam anggaran ${rupiah(budget)}.`,
      );
    else reasons.push(`Perkiraan biaya ${rupiah(a.total)} per porsi.`);
    if (a.stale)
      reasons.push(
        `Harga terlama diperbarui ${a.oldest}. Minta koordinator memperbarui harga.`,
      );

    recommendations.push({
      menu: {
        id: menu.id,
        name: menu.name,
        age_group: menu.age_group,
        serving_info: menu.serving_info,
      },
      ingredients: a.lines,
      estimated_cost: a.total,
      cost_complete: a.complete,
      price_stale: a.stale,
      oldest_price_date: a.oldest,
      food_groups: a.groups.map((g) => ({ code: g, label: FOOD_GROUPS[g] })),
      food_group_count: a.groups.length,
      animal_protein: animal.length > 0,
      reasons,
    });
  }

  // Keragaman terbanyak, lalu yang bermuatan protein hewani, lalu yang termurah.
  recommendations.sort(
    (x, y) =>
      y.food_group_count - x.food_group_count ||
      Number(y.animal_protein) - Number(x.animal_protein) ||
      Number(y.cost_complete) - Number(x.cost_complete) ||
      x.estimated_cost - y.estimated_cost,
  );
  return { recommendations, excluded };
}
