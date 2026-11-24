import { z } from 'zod';
import { text, optionalText, dateString, oneOf } from '../../utils/schemas.js';
import { FOOD_GROUPS, EXTRA_GROUP, ALLERGEN_TAGS, PRICE_UNITS } from '../../config/food.js';

const price = z
  .number({ required_error: 'Harga wajib diisi', invalid_type_error: 'Harga harus berupa angka' })
  .min(0, 'Harga tidak boleh negatif')
  .max(10000000, 'Harga terlalu besar');

export const createFoodSchema = z.object({
  name: text('Nama bahan', 100),
  unit: oneOf(PRICE_UNITS, 'Satuan harus kg, l, atau butir'),
  food_group: oneOf([...Object.keys(FOOD_GROUPS), EXTRA_GROUP], 'Kelompok pangan tidak valid'),
  allergen_tags: z.array(oneOf(ALLERGEN_TAGS, 'Tag alergen tidak valid')).max(ALLERGEN_TAGS.length).default([]),
  price: price.optional(),
  price_source: optionalText(200),
});

export const priceSchema = z.object({
  price,
  source: optionalText(200),
  effective_date: dateString('Tanggal berlaku').optional(),
});

export const activeSchema = z.object({
  is_active: z.boolean({ required_error: 'is_active wajib diisi', invalid_type_error: 'is_active harus true atau false' }),
});