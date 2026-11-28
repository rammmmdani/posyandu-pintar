import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { deleteChild, getChildren, restoreChild } from '../../services/childrenService';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/errors';
import { GENDER_LABEL, formatAge } from '../../utils/format';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button, { buttonClass } from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';

const CONSENT_BADGE = {
  diberikan: { tone: 'sukses', label: 'Persetujuan ada' },
  ditarik: { tone: 'tindak', label: 'Persetujuan ditarik' },
  belum_ada: { tone: 'perhatian', label: 'Belum ada persetujuan' },
};

export default function ChildrenPage() {
  const { isKoordinator } = useAuth();
  const toast = useToast();

  // Filter disimpan di URL agar bisa di-refresh dan dibagikan.
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const q = params.get('q') || '';
  const status = params.get('status') || 'aktif';
  const rt = params.get('rt') || '';
  const rw = params.get('rw') || '';

  const [search, setSearch] = useState(q);
  const [rtInput, setRtInput] = useState(rt);
  const [rwInput, setRwInput] = useState(rw);
  const [state, setState] = useState({ loading: true, error: '', rows: [], meta: null });
  const [confirmAction, setConfirmAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const requestStatus = q && status !== 'terhapus' ? 'semua' : status;

  const load = useCallback(
    async (isCancelled = () => false) => {
      setState((s) => ({ ...s, loading: true, error: '' }));
      try {
        const res = await getChildren({
          page,
          q: q || undefined,
          status: requestStatus,
          single: q && status !== 'terhapus' ? true : undefined,
          rt: rt || undefined,
          rw: rw || undefined,
        });
        if (!isCancelled()) setState({ loading: false, error: '', rows: res.data, meta: res.meta });
      } catch (err) {
        if (!isCancelled()) {
          setState({ loading: false, error: getErrorMessage(err), rows: [], meta: null });
        }
      }
    },
    [page, q, requestStatus, status, rt, rw]
  );

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true; // abaikan respons usang saat filter cepat berganti
    };
  }, [load]);

  const runConfirm = async () => {
    if (!confirmAction) return;
    setBusy(true);
    try {
      if (confirmAction.type === 'delete') {
        await deleteChild(confirmAction.child.id);
        toast.success('Balita berhasil dihapus');
      } else {
        await restoreChild(confirmAction.child.id);
        toast.success('Balita berhasil dipulihkan');
      }
      setConfirmAction(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const updateParams = (next) => {
    const merged = { q, status, rt, rw, page: 1, ...next };
    if (next.q !== undefined && merged.q && merged.status !== 'terhapus') merged.status = 'semua';
    const clean = {};
    if (merged.q) clean.q = merged.q;
    if (merged.status !== 'aktif') clean.status = merged.status;
    if (merged.rt) clean.rt = merged.rt;
    if (merged.rw) clean.rw = merged.rw;
    if (merged.page > 1) clean.page = String(merged.page);
    setParams(clean);
  };

  const resetFilters = () => {
    setSearch('');
    setRtInput('');
    setRwInput('');
    updateParams({ q: '', status: 'aktif', rt: '', rw: '', page: 1 });
  };

  const columns = [
    {
      key: 'name',
      header: 'Nama anak',
      render: (c) => (
        <Link to={`/balita/${c.id}`} className="font-semibold text-daun-700 underline-offset-2 hover:underline">
          {c.name}
        </Link>
      ),
    },
    { key: 'age', header: 'Usia', render: (c) => formatAge(c.age_months) },
    { key: 'gender', header: 'Jenis kelamin', render: (c) => GENDER_LABEL[c.gender] },
    { key: 'parent_name', header: 'Wali' },
    { key: 'rt', header: 'RT', render: (c) => c.rt || '-' },
    { key: 'rw', header: 'RW', render: (c) => c.rw || '-' },
    {
      key: 'consent',
      header: 'Persetujuan',
      render: (c) => {
        const badge = CONSENT_BADGE[c.consent_status] || CONSENT_BADGE.belum_ada;
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <Badge tone={c.status === 'aktif' ? 'sukses' : 'netral'}>{c.status === 'aktif' ? 'Aktif' : 'Nonaktif'}</Badge>,
    },
    ...(isKoordinator
      ? [{
          key: 'aksi',
          header: 'Aksi',
          render: (c) =>
            status === 'terhapus' ? (
              <Button variant="secondary" onClick={() => setConfirmAction({ type: 'restore', child: c })}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Pulihkan
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirmAction({ type: 'delete', child: c })}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Hapus
              </Button>
            ),
        }]
      : []),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Data Balita</h1>
        <Link to="/balita/baru" className={buttonClass('primary')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah balita
        </Link>
      </div>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({
            q: search.trim(),
            rt: rtInput.trim() || undefined,
            rw: rwInput.trim() || undefined,
          });
        }}
        className="mt-4 flex flex-wrap items-end gap-2"
      >
        <Input
          label="Cari nama anak atau wali"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select
          label="Status"
          value={requestStatus}
          onChange={(e) => updateParams({ status: e.target.value })}
          disabled={Boolean(q)}
          className="w-full sm:w-40"
        >
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
          <option value="semua">Semua status</option>
          {isKoordinator && <option value="terhapus">Terhapus</option>}
        </Select>
        <Input
          label="RT"
          inputMode="numeric"
          autoComplete="off"
          placeholder="001"
          maxLength={3}
          pattern="[0-9]{3}"
          value={rtInput}
          onChange={(e) => setRtInput(e.target.value.replace(/\D/g, '').slice(0, 3))}
          className="w-full sm:w-24"
        />
        <Input
          label="RW"
          inputMode="numeric"
          autoComplete="off"
          placeholder="002"
          maxLength={3}
          pattern="[0-9]{3}"
          value={rwInput}
          onChange={(e) => setRwInput(e.target.value.replace(/\D/g, '').slice(0, 3))}
          className="w-full sm:w-24"
        />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" aria-hidden="true" />
          Cari
        </Button>
        <Button type="button" variant="ghost" onClick={resetFilters}>
          Reset filter
        </Button>
      </form>
      {q && status !== 'terhapus' && (
        <p className="mt-2 text-sm text-redam">Menampilkan 1 balita paling relevan dari semua status.</p>
      )}

      <div className="mt-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {!state.error && (
          <>
            <Table
              columns={columns}
              rows={state.rows}
              loading={state.loading}
              emptyTitle={
                q
                  ? 'Tidak ada balita yang cocok'
                  : status === 'terhapus'
                    ? 'Tidak ada balita terhapus'
                    : 'Belum ada balita terdaftar'
              }
              emptyDescription={
                q
                  ? 'Coba kata kunci lain.'
                  : status === 'terhapus'
                    ? 'Belum ada balita yang dihapus.'
                    : 'Mulai dengan menambahkan balita pertama.'
              }
              emptyAction={
                !q && status !== 'terhapus' && (
                  <Link to="/balita/baru" className={buttonClass('primary')}>
                    Tambah balita
                  </Link>
                )
              }
            />
            <Pagination meta={state.meta} onPageChange={(p) => updateParams({ page: p })} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'restore'
            ? 'Pulihkan balita ini?'
            : 'Hapus balita ini?'
        }
        message={
          confirmAction?.type === 'restore'
            ? 'Balita akan muncul kembali di daftar sesuai status sebelumnya.'
            : 'Balita akan disembunyikan dari daftar dan laporan. Riwayat tetap tersimpan dan dapat dipulihkan oleh koordinator.'
        }
        confirmLabel={confirmAction?.type === 'restore' ? 'Pulihkan' : 'Hapus'}
        tone={confirmAction?.type === 'restore' ? 'primary' : 'danger'}
        loading={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}