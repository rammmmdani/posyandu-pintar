import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getChildren } from '../../services/childrenService';
import { getErrorMessage } from '../../utils/errors';
import { GENDER_LABEL, formatAge } from '../../utils/format';
import Alert from '../../components/ui/Alert';
import Button, { buttonClass } from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import Table from '../../components/ui/Table';

// to: (child) => path tujuan. actionLabel: teks tombol pada tiap baris.
export default function ChildPickerPage({ title, description, to, actionLabel }) {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', rows: [], meta: null });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    getChildren({ page, q: q || undefined, status: 'aktif' })
      .then((res) => !cancelled && setState({ loading: false, error: '', rows: res.data, meta: res.meta }))
      .catch((err) => !cancelled && setState({ loading: false, error: getErrorMessage(err), rows: [], meta: null }));
    return () => {
      cancelled = true;
    };
  }, [page, q]);

  const columns = [
    { key: 'name', header: 'Nama anak', render: (c) => <b>{c.name}</b> },
    { key: 'age', header: 'Usia', render: (c) => formatAge(c.age_months) },
    { key: 'gender', header: 'Jenis kelamin', render: (c) => GENDER_LABEL[c.gender] },
    { key: 'parent_name', header: 'Wali' },
    {
      key: 'action',
      header: '',
      render: (c) => (
        <Link to={to(c)} className={buttonClass('secondary')}>
          {actionLabel}
        </Link>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-redam">{description}</p>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(search.trim());
        }}
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <Input label="Cari nama anak atau wali" type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-72" />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" aria-hidden="true" />
          Cari
        </Button>
      </form>

      <div className="mt-5">
        {state.error ? (
          <Alert tone="error">{state.error}</Alert>
        ) : (
          <>
            <Table
              columns={columns}
              rows={state.rows}
              loading={state.loading}
              emptyTitle={q ? 'Tidak ada balita yang cocok' : 'Belum ada balita terdaftar'}
              emptyDescription={q ? 'Coba kata kunci lain.' : 'Daftarkan balita di menu Data Balita.'}
            />
            <Pagination meta={state.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}