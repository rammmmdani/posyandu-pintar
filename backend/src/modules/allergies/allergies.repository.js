import { pool } from '../../config/db.js';

export async function list(childId, db = pool) {
  const { rows } = await db.query(
    `SELECT a.id, a.food_item_id, f.name AS food_name, a.allergen_tag, a.note, a.created_at
     FROM child_allergies a LEFT JOIN food_items f ON f.id = a.food_item_id
     WHERE a.child_id = $1 ORDER BY a.id`,
    [childId]
  );
  return rows;
}

export async function existingFoodIds(ids) {
  if (ids.length === 0) return [];
  const { rows } = await pool.query('SELECT id FROM food_items WHERE id = ANY($1::bigint[])', [ids]);
  return rows.map((r) => r.id);
}

export async function replace(db, childId, items) {
  await db.query('DELETE FROM child_allergies WHERE child_id = $1', [childId]);
  for (const it of items) {
    await db.query(
      'INSERT INTO child_allergies (child_id, food_item_id, allergen_tag, note) VALUES ($1, $2, $3, $4)',
      [childId, it.food_item_id, it.allergen_tag, it.note]
    );
  }
}