// Teks pada badge membawa makna, warna hanya penguat.
const tones = {
  netral: "bg-slate-100 text-slate-800",
  sukses: "bg-daun-100 text-daun-900",
  perhatian: "bg-amber-100 text-amber-900",
  pemeriksaan: "bg-orange-100 text-orange-900",
  tindak: "bg-red-100 text-red-900",
};

export default function Badge({ tone = "netral", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
