import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getDashboardData } from "../../services/dashboardService";
import { getErrorMessage } from "../../utils/errors";
import { formatDate } from "../../utils/format";
import { SeverityBadge, StatusBadge, ValidationTag } from "../alerts/alertLabels";
import Alert from "../../components/ui/Alert";
import { buttonClass } from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import Table from "../../components/ui/Table";

function Stat({ label, value, hint }) {
  return (
    <Card>
      <p className="text-sm text-redam">{label}</p>
      <p className="mt-1 text-2xl font-bold text-daun-700">{value ?? 0}</p>
      {hint && <p className="mt-1 text-xs text-redam">{hint}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let cancelled = false;
    getDashboardData()
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: "", data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ loading: false, error: getErrorMessage(err), data: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) return <Spinner />;

  if (state.error) {
    return (
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Alert tone="error" className="mt-3">
          {state.error}
        </Alert>
      </div>
    );
  }

  const { totals, recent_alerts: recentAlerts } = state.data;

  const columns = [
    {
      key: "child",
      header: "Anak",
      render: (a) => (
        <Link
          to={`/peringatan/${a.id}`}
          className="font-semibold text-daun-700 hover:underline"
        >
          {a.child?.name ?? "-"}
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
      key: "created_at",
      header: "Tanggal",
      render: (a) => formatDate(a.created_at),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-redam">
            Halo, {user?.name}. Ringkasan aktivitas Posyandu.
          </p>
        </div>
        <Link to="/laporan" className={buttonClass("primary")}>
          Buat laporan
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Balita aktif"
          value={totals.children_active}
          hint={`${totals.children_inactive} balita nonaktif`}
        />
        <Stat
          label="Peringatan baru"
          value={totals.alerts_baru}
          hint={`${totals.alerts_ditindaklanjuti} sedang ditindaklanjuti`}
        />
        <Stat
          label="Notifikasi belum dibaca"
          value={totals.notifications_unread}
        />
        <Stat label="Akun terdaftar" value={totals.users} />
      </div>

      <section>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Peringatan baru</h2>
          <ValidationTag validated={false} />
        </div>
        <p className="mb-2 mt-1 text-sm text-redam">
          Daftar peringatan terbaru yang belum ditangani.
        </p>
        <Table
          columns={columns}
          rows={recentAlerts}
          emptyTitle="Tidak ada peringatan baru"
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
        <h2 className="mb-2 font-semibold">Akses cepat</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/balita" className={buttonClass("secondary", "justify-start")}>
            Data Balita
          </Link>
          <Link to="/pengukuran" className={buttonClass("secondary", "justify-start")}>
            Pengukuran
          </Link>
          <Link to="/peringatan" className={buttonClass("secondary", "justify-start")}>
            Peringatan
          </Link>
          <Link to="/laporan" className={buttonClass("secondary", "justify-start")}>
            Laporan
          </Link>
        </div>
      </section>
    </div>
  );
}
