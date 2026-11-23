import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { getChildren } from '../../services/childrenService';
import { getErrorMessage } from '../../utils/errors';
import { GENDER_LABEL, formatAge } from '../../utils/format';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button, { buttonClass } from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';

const CONSENT_BADGE = {
  diberikan: { tone: 'sukses', label: 'Persetujuan ada' },
  ditarik: { tone: 'tindak', label: 'Persetujuan ditarik' },
  belum_ada: { tone: 'perhatian', label: 'Belum ada persetujuan' },
};

export default function ChildrenPage() {
  // Filter disimpan di URL agar bisa di-refresh dan dibagikan.
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const q = params.get('q') || '';
  const status = params.get('status') || 'aktif';

  const [search, setSearch] = useState(q);
  const [state, setState] = useState({ loading: true, error: '', rows: [], meta: null });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    getChildren({ page, search: q || undefined, status })
    getChildren({ page, search: q || undefined, status })
      .then((res) => {
        if (!cancelled) setState({ loading: false, error: '', rows: res.data, meta: res.meta });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: getErrorMessage(err), rows: [], meta: null });
      });
    return () => {
      cancelled = true; // abaikan respons usang saat filter cepat berganti
    };
  }, [page, q, status]);

  const updateParams = (next) => {
    const merged = { q, status, page: 1, ...next };
    const clean = {};
    if (merged.q) clean.q = merged.q;
    if (merged.status !== 'aktif') clean.status = merged.status;
    if (merged.page > 1) clean.page = String(merged.page);
    setParams(clean);
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
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Data Balita</h1>
        <Link to="/balita/baru" className={buttonClass('primary')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah balita
        </Link>
      </div>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ q: search.trim() });
        }}
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <Input
          label="Cari nama anak atau wali"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72"
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="w-full sm:w-40"
        >
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </Select>
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" aria-hidden="true" />
          Cari
        </Button>
      </form>

      <div className="mt-5">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {!state.error && (
          <>
            <Table
              columns={columns}
              rows={state.rows}
              loading={state.loading}
              emptyTitle={q ? 'Tidak ada balita yang cocok' : 'Belum ada balita terdaftar'}
              emptyDescription={q ? 'Coba kata kunci lain.' : 'Mulai dengan menambahkan balita pertama.'}
              emptyAction={
                !q && (
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
    </div>
  );
}