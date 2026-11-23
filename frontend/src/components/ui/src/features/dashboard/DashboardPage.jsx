import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardSummary } from "../../services/dashboardService";
import { getErrorMessage } from "../../utils/errors";
import { SeverityBadge, StatusBadge } from "../alerts/alertLabels";
import Alert from "../../components/ui/Alert";
import { buttonClass } from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import Table from "../../components/ui/Table";

function Stat({ label, value, hint }) {
  return (
    <Card>
      <p className="text-sm text-redam">{label}</p>
      <p className="mt-1 text-3xl font-bold text-daun-700">{value}</p>
      {hint && <p className="mt-1 text-xs text-redam">{hint}</p>}
    </Card>
  );
}

// Jumlah selalu ditulis sebagai angka. Batang hanya penguat, bukan satu-satunya penanda.
function Distribution({ item }) {
  const max = Math.max(1, ...item.items.map((i) => i.count));
  return (
    <Card>
      <h3 className="font-semibold">{item.label}</h3>
      <p className="text-xs text-redam">
        {item.total - item.unavailable} dari {item.total} balita dinilai
      </p>
      <ul className="mt-3 space-y-2">
        {item.items.map((c) => (
          <li key={c.code}>
            <div className="flex items-center justify-between text-sm">
              <span>{c.label}</span>
              <b>{c.count}</b>
            </div>
            <div className="mt-1 h-2 rounded bg-kertas" aria-hidden="true">
              <div
                className="h-2 rounded bg-daun-600"
                style={{ width: `${(c.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {item.unavailable > 0 && (
        <p className="mt-3 text-xs text-redam">
          Belum dapat dihitung: {item.unavailable} balita
        </p>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let cancelled = false;
    getDashboardSummary()
      .then(
        (res) =>
          !cancelled && setState({ loading: false, error: "", data: res.data }),
      )
      .catch(
        (err) =>
          !cancelled &&
          setState({ loading: false, error: getErrorMessage(err), data: null }),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) return <Spinner />;
  if (state.error) return <Alert tone="error">{state.error}</Alert>;

  const {
    totals: t,
    open_alerts_by_severity: sev,
    attention,
    category_distribution: dist,
    posyandu,
  } = state.data;

  const columns = [
    {
      key: "child",
      header: "Anak",
      render: (a) => (
        <Link
          to={`/peringatan/${a.alert_id}`}
          className="font-semibold text-daun-700 hover:underline"
        >
          {a.child.name}
        </Link>
      ),
    },
    { key: "message", header: "Peringatan", className: "max-w-sm" },
    {
      key: "severity",
      header: "Tingkat",
      render: (a) => <SeverityBadge severity={a.severity} />,
    },
    {
      key: "status",
      header: "Status",
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: "days",
      header: "Sudah",
      render: (a) => (a.days_open === 0 ? "Hari ini" : `${a.days_open} hari`),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-redam">Ringkasan {posyandu.name}</p>
        </div>
        <Link to="/laporan" className={buttonClass("primary")}>
          Buat laporan
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Balita aktif"
          value={t.children_active}
          hint={
            t.children_inactive ? `${t.children_inactive} nonaktif` : undefined
          }
        />
        <Stat
          label="Diukur bulan ini"
          value={t.children_measured_this_month}
          hint={`${t.measurements_this_month} pengukuran, dari ${t.children_active} balita aktif`}
        />
        <Stat
          label="Peringatan belum ditangani"
          value={t.alerts_unhandled}
          hint={`${t.alerts_baru} baru, ${t.alerts_in_progress} sedang ditindaklanjuti`}
        />
        <Stat label="Tindak lanjut bulan ini" value={t.follow_ups_this_month} />
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Perlu perhatian</h2>
        <p className="mb-3 text-sm text-redam">
          Belum ditangani: {sev.perlu_tindak_lanjut} perlu tindak lanjut,{" "}
          {sev.perlu_pemeriksaan} perlu pemeriksaan, {sev.perlu_perhatian} perlu
          perhatian. Tingkat peringatan masih contoh dan belum divalidasi tenaga
          kesehatan.
        </p>
        <Table
          columns={columns}
          rows={attention}
          rowKey="alert_id"
          emptyTitle="Tidak ada peringatan yang menunggu"
          emptyDescription="Semua peringatan sudah ditindaklanjuti atau ditutup."
        />
        <Link
          to="/peringatan"
          className="mt-2 inline-block text-sm text-daun-700 hover:underline"
        >
          Lihat semua peringatan
        </Link>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Distribusi status gizi</h2>
        <p className="mb-3 text-sm text-redam">
          Berdasarkan pengukuran terakhir setiap balita aktif. Kategori
          mengikuti Permenkes No. 2 Tahun 2020.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {dist.map((d) => (
            <Distribution key={d.indicator} item={d} />
          ))}
        </div>
      </section>
    </div>
  );
}
