import { withTransaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/audit.js';
import { todayString } from '../../utils/dates.js';
import { PRICE_STALE_DAYS } from '../../config/food.js';
import { daysBetween } from '../reports/period.js';
import * as repo from './foods.repository.js';

const bad = (field, message) => new ApiError(400, 'VALIDATION_ERROR', 'Data tidak valid', [{ field, message }]);

function toFood(r) {
  const price = r.price === null || r.price === undefined
    ? null
    : {
        value: r.price,
        date: r.price_date,
        source: r.price_source,
        stale: daysBetween(r.price_date, todayString()) > PRICE_STALE_DAYS,
      };
  return { id: r.id, name: r.name, unit: r.unit, food_group: r.food_group, allergen_tags: r.allergen_tags, is_active: r.is_active, price };
}

export async function listFoods() {
  return (await repo.list()).map(toFood);
}

async function getOrFail(id) {
  const row = await repo.findById(id);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Bahan tidak ditemukan');
  return row;
}

function checkDate(date) {
  if (date > todayString()) throw bad('effective_date', 'Tanggal berlaku tidak boleh di masa depan');
}

export async function createFood(user, input, ip) {
  let id;
  try {
    id = await withTransaction(async (db) => {
      const foodId = await repo.insertFood(db, input);
      if (input.price !== undefined) {
        await repo.insertPrice(db, {
          food_item_id: foodId, price: input.price, source: input.price_source,
          effective_date: todayString(), created_by: user.id,
        });
      }
      return foodId;
    });
  } catch (err) {
    if (err.code === '23505') throw new ApiError(409, 'DUPLICATE_FOOD', 'Nama bahan sudah ada', [{ field: 'name', message: 'Nama bahan sudah ada' }]);
    throw err;
  }
  await logAudit({ userId: user.id, action: 'create', entityType: 'food_item', entityId: id, newData: { name: input.name, food_group: input.food_group }, ip });
  return toFood(await getOrFail(id));
}

export async function addPrice(user, id, input, ip) {
  const before = await getOrFail(id);
  const effective = input.effective_date ?? todayString();
  checkDate(effective);
  await withTransaction((db) =>
    repo.insertPrice(db, { food_item_id: id, price: input.price, source: input.source, effective_date: effective, created_by: user.id })
  );
  // Histori harga tersimpan di tabel; audit mencatat siapa mengubah dari berapa menjadi berapa.
  await logAudit({
    userId: user.id, action: 'update_price', entityType: 'food_item', entityId: id,
    oldData: { price: before.price }, newData: { price: input.price, effective_date: effective }, ip,
  });
  return toFood(await getOrFail(id));
}

export async function setActive(user, id, isActive, ip) {
  await getOrFail(id);
  await repo.setActive(id, isActive);
  await logAudit({ userId: user.id, action: 'update', entityType: 'food_item', entityId: id, newData: { is_active: isActive }, ip });
  return toFood(await getOrFail(id));
}