import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getNotifications,
  markNotificationRead,
} from "../../services/notificationsService";
import { getErrorMessage } from "../../utils/errors";
import { formatDate } from "../../utils/format";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import Spinner from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";

export default function NotificationsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState({
    loading: true,
    error: "",
    rows: [],
    meta: null,
  });

  const load = useCallback(async () => {
    try {
      const res = await getNotifications({
        page,
        is_read: filter || undefined,
      });
      setState({ loading: false, error: "", rows: res.data, meta: res.meta });
    } catch (err) {
      setState({
        loading: false,
        error: getErrorMessage(err),
        rows: [],
        meta: null,
      });
    }
  }, [page, filter]);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
  }, [load]);

  const read = async (n) => {
    if (n.is_read) return;
    try {
      await markNotificationRead(n.id);
      setState((s) => ({
        ...s,
        rows: s.rows.map((r) => (r.id === n.id ? { ...r, is_read: true } : r)),
      }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold">Notifikasi</h1>
      <Select
        label="Tampilkan"
        value={filter}
        onChange={(e) => {
          setPage(1);
          setFilter(e.target.value);
        }}
        className="mt-3 w-full sm:w-48"
      >
        <option value="">Semua</option>
        <option value="false">Belum dibaca</option>
        <option value="true">Sudah dibaca</option>
      </Select>

      <div className="mt-4 space-y-2">
        {state.loading && <Spinner />}
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {!state.loading && !state.error && state.rows.length === 0 && (
          <EmptyState
            title="Tidak ada notifikasi"
            description="Notifikasi muncul saat ada peringatan baru."
          />
        )}
        {state.rows.map((n) => (
          <Card
            key={n.id}
            className={n.is_read ? "" : "border-l-4 border-l-daun-600"}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  {!n.is_read && <Badge tone="sukses">Baru</Badge>}
                  <span className="text-xs text-redam">
                    {formatDate(n.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm">{n.body}</p>
              </div>
              <div className="flex gap-2 text-sm">
                {n.alert_id && (
                  <Link
                    to={`/peringatan/${n.alert_id}`}
                    onClick={() => read(n)}
                    className="font-semibold text-daun-700 hover:underline"
                  >
                    Lihat peringatan
                  </Link>
                )}
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => read(n)}
                    className="font-semibold text-redam hover:underline"
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
        <Pagination meta={state.meta} onPageChange={setPage} />
      </div>
    </div>
  );
}
