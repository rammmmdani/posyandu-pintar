// Perhitungan z-score dengan metode LMS.
// Fungsi murni: tanpa database, tanpa efek samping.

export function valueAtSD(k, { l, m, s }) {
  return l === 0 ? m * Math.exp(s * k) : m * Math.pow(1 + l * s * k, 1 / l);
}

export function lmsZScore(y, ref, { adjustTails }) {
  const { l, m, s } = ref;

  if (!(y > 0)) {
    throw new Error("Nilai pengukuran harus lebih dari 0");
  }

  const z = l === 0 ? Math.log(y / m) / s : (Math.pow(y / m, l) - 1) / (l * s);

  if (!adjustTails || Math.abs(z) <= 3) return z;

  if (z > 3) {
    const sd3 = valueAtSD(3, ref);
    const sd23 = sd3 - valueAtSD(2, ref);
    return 3 + (y - sd3) / sd23;
  }

  const sd3neg = valueAtSD(-3, ref);
  const sd23neg = valueAtSD(-2, ref) - sd3neg;

  return -3 + (y - sd3neg) / sd23neg;
}

// WHO melaporkan z-score dengan dua angka desimal.
export const roundZ = (z) => Math.round(z * 100) / 100;
