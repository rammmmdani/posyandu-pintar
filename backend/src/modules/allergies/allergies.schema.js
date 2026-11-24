import { z } from 'zod';
import { optionalText, oneOf } from '../../utils/schemas.js';
import { ALLERGEN_TAGS } from '../../config/food.js';

const item = z
  .object({
    food_item_id: z.number().int().positive().nullish().transform((v) => v ?? null),
    allergen_tag: oneOf(ALLERGEN_TAGS, 'Tag alergen tidak valid').nullish().transform((v) => v ?? null),
    note: optionalText(200),
  })
  .refine((d) => d.food_item_id !== null || d.allergen_tag !== null, {
    message: 'Pilih bahan atau kategori alergen',
  });

// Menggantikan seluruh daftar alergi dan pantangan anak.
export const replaceAllergiesSchema = z.object({
  items: z.array(item, { required_error: 'items wajib diisi' }).max(30, 'Maksimal 30 data'),
});