import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAlerts } from '../../services/alertsService';
import { getErrorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import { SeverityBadge, StatusBadge, ValidationTag } from './alertLabels';
import Alert from '../../components/ui/Alert';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';

export default function AlertsPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const status = params.get('status') || '';
  const severity = params.get('severity') || '';
  const [state, setState] = useState({ loading: true, error: '', rows: [], meta: null });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    getAlerts({ page, status: status || undefined, severity: severity || undefined })
      .then((res) => !cancelled && setState({ loading: false, error: '', rows: res.data, meta: res.meta }))
      .catch((err) => !cancelled && setState({ loading: false, error: getErrorMessage(err), rows: [], meta: null }));
    return () => {
      cancelled = true;
    };
  }, [page, status, severity]);

  const update = (next) => {
    const merged = { status, severity, page: 1, ...next };
    const clean = {};
    if (merged.status) clean.status = merged.status;
    if (merged.severity) clean.severity = merged.severity;
    if (merged.page > 1) clean.page = String(merged.page);
    setParams(clean);
  };

  const columns = [
    {
      key: 'child',
      header: 'Anak',
      render: (a) => (
        <Link to={`/peringatan/${a.id}`} className="font-semibold text-daun-700 hover:underline">
          {a.child.name}
        </Link>
      ),
    },
    { key: 'message', header: 'Peringatan', className: 'max-w-xs' },
    { key: 'severity', header: 'Tingkat', render: (a) => <SeverityBadge severity={a.severity} /> },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'created_at', header: 'Tanggal', render: (a) => formatDate(a.created_at) },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Peringatan dan Tindak Lanjut</h1>
        <ValidationTag validated={false} />
      </div>
      <p className="mt-1 text-sm text-redam">
        Peringatan adalah penanda yang perlu diperhatikan, bukan diagnosis. Keputusan tetap pada tenaga kesehatan.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Select label="Status" value={status} onChange={(e) => update({ status: e.target.value })} className="w-full sm:w-48">
          <option value="">Semua</option>
          <option value="baru">Baru</option>
          <option value="dilihat">Dilihat</option>
          <option value="ditindaklanjuti">Ditindaklanjuti</option>
          <option value="ditutup">Ditutup</option>
        </Select>
        <Select label="Tingkat" value={severity} onChange={(e) => update({ severity: e.target.value })} className="w-full sm:w-56">
          <option value="">Semua</option>
          <option value="perlu_perhatian">Perlu perhatian</option>
          <option value="perlu_pemeriksaan">Perlu pemeriksaan</option>
          <option value="perlu_tindak_lanjut">Perlu tindak lanjut</option>
        </Select>
      </div>

      <div className="mt-5">
        {state.error ? (
          <Alert tone="error">{state.error}</Alert>
        ) : (
          <>
            <Table
              columns={columns}
              rows={state.rows}
              loading={state.loading}
              emptyTitle="Tidak ada peringatan"
              emptyDescription={status || severity ? 'Coba ubah filter.' : 'Peringatan muncul otomatis saat hasil pengukuran memerlukan perhatian.'}
            />
            <Pagination meta={state.meta} onPageChange={(p) => update({ page: p })} />
          </>
        )}
      </div>
    </div>
  );
}