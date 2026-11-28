import { useCallback, useEffect, useState } from 'react';
import { createReport, downloadReport, getReports } from '../../services/reportsService';
import { getErrorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import { useOnline } from '../../hooks/useOnline';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';

const TYPE_LABEL = { bulanan: 'Bulanan', rekap_6_bulan: 'Rekap 6 bulan', kustom: 'Periode khusus' };
const STATUS = {
  diproses: { tone: 'netral', label: 'Diproses' },
  selesai: { tone: 'sukses', label: 'Selesai' },
  gagal: { tone: 'tindak', label: 'Gagal' },
};

const thisMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7);

// Parameter untuk membuat ulang laporan dengan periode yang sama.
const paramsFromReport = (r) =>
  r.report_type === 'kustom'
    ? { report_type: 'kustom', period_start: String(r.period_start).slice(0, 10), period_end: String(r.period_end).slice(0, 10) }
    : { report_type: r.report_type, month: String(r.period_end).slice(0, 7) };

export default function ReportsPage() {
  const toast = useToast();
  const online = useOnline();
  const [form, setForm] = useState({ report_type: 'bulanan', month: thisMonth(), period_start: '', period_end: '' });
  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', rows: [], meta: null });
  const [downloading, setDownloading] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await getReports({ page });
      setState({ loading: false, error: '', rows: res.data, meta: res.meta });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err), rows: [], meta: null });
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async (payload) => {
    setCreating(true);
    try {
      const res = await createReport(payload);
      if (res.data.status === 'selesai') toast.success('Laporan berhasil dibuat');
      else toast.error(res.data.error_message || 'Laporan gagal dibuat');
      setPage(1);
      await load();
    } catch (err) {
      const body = err.response?.data;
      if (body?.errors?.length) setErrors(Object.fromEntries(body.errors.map((x) => [x.field, x.message])));
      else toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const found = {};
    if (form.report_type === 'kustom') {
      if (!form.period_start) found.period_start = 'Tanggal mulai wajib diisi';
      if (!form.period_end) found.period_end = 'Tanggal akhir wajib diisi';
      else if (form.period_start && form.period_end < form.period_start) found.period_end = 'Tanggal akhir tidak boleh sebelum tanggal mulai';
    } else if (!form.month) {
      found.month = 'Bulan wajib diisi';
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    generate(
      form.report_type === 'kustom'
        ? { report_type: 'kustom', period_start: form.period_start, period_end: form.period_end }
        : { report_type: form.report_type, month: form.month }
    );
  };

  const download = async (r) => {
    setDownloading(r.id);
    try {
      await downloadReport(r.id, `laporan-posyandu-${String(r.period_start).slice(0, 10)}-sd-${String(r.period_end).slice(0, 10)}.pdf`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  const columns = [
    { key: 'type', header: 'Jenis', render: (r) => TYPE_LABEL[r.report_type] },
    { key: 'period', header: 'Periode', render: (r) => `${formatDate(r.period_start)} sampai ${formatDate(r.period_end)}` },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge> },
    { key: 'by', header: 'Dibuat oleh', render: (r) => <span>{r.created_by.name}<br /><span className="text-xs text-redam">{formatDate(r.created_at)}</span></span> },
    {
      key: 'action',
      header: '',
      render: (r) =>
        r.status === 'selesai' ? (
          <Button variant="secondary" loading={downloading === r.id} onClick={() => download(r)}>Unduh PDF</Button>
        ) : r.status === 'gagal' ? (
          <div>
            <p className="mb-1 max-w-xs text-xs text-red-700">{r.error_message}</p>
            <Button variant="secondary" disabled={creating || !online} onClick={() => generate(paramsFromReport(r))}>Buat ulang</Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Laporan</h1>

      <Card>
        <h2 className="font-semibold">Buat laporan</h2>
        <form onSubmit={submit} noValidate className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Jenis laporan" value={form.report_type} onChange={(e) => { setForm({ ...form, report_type: e.target.value }); setErrors({}); }}>
              <option value="bulanan">Bulanan</option>
              <option value="rekap_6_bulan">Rekap 6 bulan</option>
              <option value="kustom">Periode khusus</option>
            </Select>
            {form.report_type !== 'kustom' ? (
              <Input
                label={form.report_type === 'rekap_6_bulan' ? 'Bulan terakhir rekap' : 'Bulan'}
                type="month"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
                error={errors.month}
                hint={form.report_type === 'rekap_6_bulan' ? 'Rekap mencakup 6 bulan yang berakhir pada bulan ini.' : undefined}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 sm:col-span-1">
                <Input label="Dari" type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} error={errors.period_start} />
                <Input label="Sampai" type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} error={errors.period_end} />
              </div>
            )}
          </div>
          {!online && <Alert tone="warning">Tidak ada koneksi internet. Laporan tidak dapat dibuat.</Alert>}
          <Button type="submit" loading={creating} disabled={!online}>{creating ? 'Membuat laporan...' : 'Buat laporan'}</Button>
        </form>
        <p className="mt-3 text-xs text-redam">
          Laporan memuat data kesehatan anak. Periksa isinya sebelum dibagikan, dan bagikan hanya melalui kanal yang aman kepada pihak yang berwenang.
        </p>
      </Card>

      <section>
        <h2 className="mb-2 font-semibold">Riwayat laporan</h2>
        {state.error ? (
          <Alert tone="error">{state.error}</Alert>
        ) : (
          <>
            <Table columns={columns} rows={state.rows} loading={state.loading} emptyTitle="Belum ada laporan" emptyDescription="Buat laporan pertama di atas." />
            <Pagination meta={state.meta} onPageChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}