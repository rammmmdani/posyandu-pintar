import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "../../utils/format";
import Card from "../../components/ui/Card";
import { dotColorFor, toneForCategory } from "./growthStatus";

const METRICS = [
  {
    key: "weight_kg",
    label: "Berat badan",
    unit: "kg",
    categoryKey: "bb_u",
    get: (p) => p.weight_kg,
  },
  {
    key: "height_cm",
    label: "Panjang/tinggi badan",
    unit: "cm",
    categoryKey: "tb_u",
    get: (p) => p.height_cm,
  },
  {
    key: "z_bb_u",
    label: "z-score BB/U",
    unit: "SD",
    z: true,
    categoryKey: "bb_u",
    get: (p) => p.zscores?.bb_u ?? null,
  },
  {
    key: "z_tb_u",
    label: "z-score PB/U atau TB/U",
    unit: "SD",
    z: true,
    categoryKey: "tb_u",
    get: (p) => p.zscores?.tb_u ?? null,
  },
  {
    key: "z_bb_tb",
    label: "z-score BB/PB atau BB/TB",
    unit: "SD",
    z: true,
    categoryKey: "bb_tb",
    get: (p) => p.zscores?.bb_tb ?? null,
  },
  {
    key: "z_imt_u",
    label: "z-score IMT/U",
    unit: "SD",
    z: true,
    categoryKey: "imt_u",
    get: (p) => p.zscores?.imt_u ?? null,
  },
];

// Lingkaran = data valid, persegi = perlu diperiksa. Bentuk berbeda, bukan hanya warna.
function Dot({ cx, cy, payload, metric }) {
  if (cx == null || cy == null) return null;
  const key = `dot-${payload.measurement_id}`;
  if (payload.validity_status === "perlu_diperiksa") {
    return (
      <rect
        key={key}
        x={cx - 5}
        y={cy - 5}
        width={10}
        height={10}
        fill="#ffffff"
        stroke="#b45309"
        strokeWidth={2}
      />
    );
  }
  const code = payload.category_codes?.[metric.categoryKey];
  const label = payload.categories?.[metric.categoryKey];
  return (
    <circle
      key={key}
      cx={cx}
      cy={cy}
      r={4}
      fill={dotColorFor(toneForCategory(code, label))}
    />
  );
}

function ChartTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-garis bg-white px-3 py-2 text-xs">
      <p className="font-semibold">{formatDate(p.measurement_date)}</p>
      {p.age_months !== null && (
        <p className="text-redam">Usia {p.age_months} bulan</p>
      )}
      {p.categories?.[metric.categoryKey] && (
        <p className="text-redam">
          Status WHO: <b>{p.categories[metric.categoryKey]}</b>
        </p>
      )}
      <p>
        {metric.label}: <b>{String(p.value).replace(".", ",")}</b> {metric.unit}
      </p>
      {p.validity_status === "perlu_diperiksa" && (
        <p className="font-semibold text-amber-800">Perlu diperiksa</p>
      )}
    </div>
  );
}

export default function GrowthChart({ points }) {
  const available = useMemo(
    () =>
      METRICS.filter(
        (m) =>
          points.filter((p) => m.get(p) !== null && m.get(p) !== undefined)
            .length > 0,
      ),
    [points],
  );
  const [selected, setSelected] = useState("weight_kg");
  const metric = available.find((m) => m.key === selected) || available[0];

  if (!metric) {
    return (
      <Card>
        <p className="text-sm text-redam">
          Belum ada data yang dapat digambar.
        </p>
      </Card>
    );
  }

  const withAge = points.every((p) => p.age_months !== null);
  const data = points.map((p) => ({
    ...p,
    value: metric.get(p),
    x: withAge ? p.age_months : formatDate(p.measurement_date),
  }));
  const filled = data.filter((d) => d.value !== null && d.value !== undefined);
  const summary = `Grafik ${metric.label} dengan ${filled.length} titik data`;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Grafik pertumbuhan</h3>
        <div
          role="group"
          aria-label="Pilih indikator grafik"
          className="flex flex-wrap gap-1"
        >
          {available.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={m.key === metric.key}
              onClick={() => setSelected(m.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                m.key === metric.key
                  ? "border-daun-600 bg-daun-50 text-daun-700"
                  : "border-garis bg-white text-redam hover:bg-kertas"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {filled.length < 2 ? (
        <p className="mt-3 rounded-lg bg-kertas p-3 text-sm text-redam">
          Grafik tampil setelah ada minimal dua pengukuran. Riwayat lengkap ada
          pada tabel di bawah.
        </p>
      ) : (
        <div role="img" aria-label={summary} className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid stroke="#d6e0da" strokeDasharray="3 3" />
              {withAge ? (
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  allowDecimals={false}
                  label={{
                    value: "Usia (bulan)",
                    position: "insideBottom",
                    offset: -2,
                    fontSize: 11,
                  }}
                  tick={{ fontSize: 11 }}
                />
              ) : (
                <XAxis dataKey="x" tick={{ fontSize: 11 }} />
              )}
              <YAxis
                tick={{ fontSize: 11 }}
                domain={
                  metric.z
                    ? [
                        (min) => Math.min(-4, Math.floor(min)),
                        (max) => Math.max(4, Math.ceil(max)),
                      ]
                    : ["dataMin - 1", "dataMax + 1"]
                }
                label={{
                  value: metric.unit,
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                }}
              />
              {metric.z &&
                [0, 2, -2, 3, -3].map((y) => (
                  <ReferenceLine
                    key={y}
                    y={y}
                    stroke="#9aa5b1"
                    strokeDasharray="4 4"
                    label={{
                      value: y > 0 ? `+${y}` : String(y),
                      fontSize: 10,
                      position: "right",
                    }}
                  />
                ))}
              <Tooltip content={<ChartTooltip metric={metric} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1f7a5c"
                strokeWidth={2.5}
                connectNulls={false}
                dot={<Dot metric={metric} />}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-3 text-xs text-redam">
        Lingkaran: data valid. Persegi: data perlu diperiksa. Warna lingkaran mengikuti status WHO: hijau normal, kuning perlu perhatian, oranye perlu pemeriksaan, merah perlu tindak lanjut.
        {metric.z &&
          " Garis putus-putus pada 0, ±2, dan ±3 SD adalah garis bantu baca, bukan diagnosis."}
      </p>
    </Card>
  );
}
