import { pool } from "../../config/db.js";

// Menu aktif untuk satu kelompok usia beserta bahan dan harga terbarunya.
export async function listMenus(ageGroup) {
  const { rows } = await pool.query(
    `SELECT m.id AS menu_id, m.name AS menu_name, m.age_group, m.serving_info,
            mi.food_item_id, mi.quantity, mi.unit,
            f.name AS item_name, f.unit AS item_unit, f.food_group, f.allergen_tags, f.is_active,
            p.price, p.effective_date AS price_date
     FROM menus m
     JOIN menu_ingredients mi ON mi.menu_id = m.id
     JOIN food_items f ON f.id = mi.food_item_id
     LEFT JOIN LATERAL (
       SELECT price, effective_date FROM food_item_prices fp
       WHERE fp.food_item_id = f.id ORDER BY fp.effective_date DESC, fp.id DESC LIMIT 1
     ) p ON TRUE
     WHERE m.status = 'aktif' AND m.age_group = $1
     ORDER BY m.id, mi.id`,
    [ageGroup],
  );

  const byMenu = new Map();
  for (const r of rows) {
    if (!byMenu.has(r.menu_id)) {
      byMenu.set(r.menu_id, {
        id: r.menu_id,
        name: r.menu_name,
        age_group: r.age_group,
        serving_info: r.serving_info,
        ingredients: [],
      });
    }
    byMenu.get(r.menu_id).ingredients.push({
      food_item_id: r.food_item_id,
      name: r.item_name,
      quantity: r.quantity,
      unit: r.unit,
      item_unit: r.item_unit,
      food_group: r.food_group,
      allergen_tags: r.allergen_tags,
      is_active: r.is_active,
      price: r.price,
      price_date: r.price_date,
    });
  }
  return [...byMenu.values()];
}

export async function listAllergies(childId) {
  const { rows } = await pool.query(
    "SELECT food_item_id, allergen_tag FROM child_allergies WHERE child_id = $1",
    [childId],
  );
  return rows;
}
