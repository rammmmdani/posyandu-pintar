import { pool } from '../../config/db.js';

const LATEST = `LEFT JOIN LATERAL (
  SELECT price, effective_date, source FROM food_item_prices fp
  WHERE fp.food_item_id = f.id ORDER BY fp.effective_date DESC, fp.id DESC LIMIT 1
) p ON TRUE`;

const COLS = `f.id, f.name, f.unit, f.food_group, f.allergen_tags, f.is_active,
  p.price, p.effective_date AS price_date, p.source AS price_source`;

export async function list() {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM food_items f ${LATEST} ORDER BY f.is_active DESC, f.food_group, lower(f.name)`
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(`SELECT ${COLS} FROM food_items f ${LATEST} WHERE f.id = $1`, [id]);
  return rows[0] || null;
}

export async function insertFood(db, f) {
  const { rows } = await db.query(
    `INSERT INTO food_items (name, unit, food_group, allergen_tags) VALUES ($1, $2, $3, $4) RETURNING id`,
    [f.name, f.unit, f.food_group, f.allergen_tags]
  );
  return rows[0].id;
}

export async function insertPrice(db, p) {
  await db.query(
    `INSERT INTO food_item_prices (food_item_id, price, source, effective_date, created_by) VALUES ($1, $2, $3, $4, $5)`,
    [p.food_item_id, p.price, p.source, p.effective_date, p.created_by]
  );
}

export async function setActive(id, isActive) {
  await pool.query('UPDATE food_items SET is_active = $2 WHERE id = $1', [id, isActive]);
}