import { withTransaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/audit.js';
import * as childrenRepo from '../children/children.repository.js';
import * as repo from './allergies.repository.js';

const toAllergy = (r) => ({
  id: r.id,
  food_item: r.food_item_id ? { id: r.food_item_id, name: r.food_name } : null,
  allergen_tag: r.allergen_tag,
  note: r.note,
  created_at: r.created_at,
});

async function childOrFail(user, childId) {
  const child = await childrenRepo.findById(user.posyandu_id, childId);
  if (!child) throw new ApiError(404, 'NOT_FOUND', 'Data balita tidak ditemukan');
  return child;
}

export async function listAllergies(user, childId) {
  await childOrFail(user, childId);
  return (await repo.list(childId)).map(toAllergy);
}

export async function replaceAllergies(user, childId, items, ip) {
  await childOrFail(user, childId);

  const foodIds = [...new Set(items.map((i) => i.food_item_id).filter((v) => v !== null))];
  const found = await repo.existingFoodIds(foodIds);
  const missing = foodIds.filter((id) => !found.includes(id));
  if (missing.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Data tidak valid', [{ field: 'items', message: 'Ada bahan yang tidak ditemukan' }]);
  }

  // Buang duplikat (bahan atau kategori yang sama).
  const seen = new Set();
  const unique = items.filter((i) => {
    const key = `${i.food_item_id}|${i.allergen_tag}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await withTransaction((db) => repo.replace(db, childId, unique));
  await logAudit({ userId: user.id, action: 'update_allergies', entityType: 'child', entityId: childId, newData: { count: unique.length }, ip });
  return (await repo.list(childId)).map(toAllergy);
}