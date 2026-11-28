import { formatAge, formatDate } from "../../utils/format";
import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";
import { toneForCategory } from "./growthStatus";

const VALIDITY = {
  valid: { tone: "sukses", label: "Valid" },
  perlu_diperiksa: { tone: "perhatian", label: "Perlu diperiksa" },
  tidak_lengkap: { tone: "netral", label: "Belum lengkap" },
};

const WHO_INDICATORS = [
  { key: "bb_u", label: "BB/U" },
  { key: "tb_u", label: "TB/U" },
  { key: "bb_tb", label: "BB/TB" },
  { key: "imt_u", label: "IMT/U" },
];

const num = (v, unit) =>
  v === null || v === undefined
    ? "-"
    : `${String(v).replace(".", ",")} ${unit}`;

export default function GrowthTable({ points }) {
  const rows = [...points].reverse(); // terbaru di atas
  const columns = [
    {
      key: "date",
      header: "Tanggal",
      render: (p) => formatDate(p.measurement_date),
    },
    { key: "age", header: "Usia", render: (p) => formatAge(p.age_months) },
    { key: "weight", header: "Berat", render: (p) => num(p.weight_kg, "kg") },
    {
      key: "height",
      header: "Panjang/tinggi",
      render: (p) => num(p.height_cm, "cm"),
    },
    {
      key: "z",
      header: "z-score BB/U",
      render: (p) =>
        p.zscores?.bb_u === null || p.zscores?.bb_u === undefined
          ? "-"
          : String(p.zscores.bb_u).replace(".", ","),
    },
    {
      key: "who",
      header: "Status WHO",
      render: (p) => {
        const badges = WHO_INDICATORS.map((indicator) => {
          const code = p.category_codes?.[indicator.key];
          const label = p.categories?.[indicator.key];
          if (!code && !label) return null;
          return (
            <Badge key={indicator.key} tone={toneForCategory(code, label)}>
              {indicator.label}: {label}
            </Badge>
          );
        }).filter(Boolean);
        return badges.length ? (
          <div className="flex flex-wrap gap-1">{badges}</div>
        ) : (
          <span className="text-redam">-</span>
        );
      },
    },
    {
      key: "status",
      header: "Status data",
      render: (p) => {
        const v = VALIDITY[p.validity_status];
        return <Badge tone={v.tone}>{v.label}</Badge>;
      },
    },
  ];
  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey="measurement_id"
      emptyTitle="Belum ada pengukuran"
    />
  );
}
