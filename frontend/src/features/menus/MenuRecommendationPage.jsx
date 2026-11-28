import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRecommendations } from '../../services/menusService';
import { getErrorMessage } from '../../utils/errors';
import { formatDate, formatAge } from '../../utils/format';
import { ValidationTag } from '../alerts/alertLabels';
import { FOOD_GROUP_LABEL, formatQty, rupiah } from './menuLabels';
import AllergyEditor from './AllergyEditor';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';

function Guidance({ g }) {
  const rows = [
    ['Tekstur', g.texture], ['Jumlah', g.amount], ['Frekuensi', g.meals], ['Selingan', g.snack], ['Target energi', g.energy],
    ['AKG harian', g.akg ? `${g.akg.energy_kcal.toLocaleString('id-ID')} kkal dan ${g.akg.protein_g} g protein (${g.akg.label})` : null],
  ].filter(([, v]) => v);
  return (
    <Card>
      <h2 className="font-semibold">Pedoman untuk usia {g.label}</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm text-redam">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-redam">Sumber: Kemenkes (pedoman pemberian makan bayi dan anak) dan Permenkes No. 28 Tahun 2019 tentang AKG.</p>
    </Card>
  );
}

function MenuCard({ r }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{r.menu.name}</h3>
          <p className="mt-1 text-sm text-redam">{r.menu.serving_info}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-daun-700">{rupiah(r.estimated_cost)}</p>
          <p className="text-xs text-redam">per porsi{!r.cost_complete && ', belum lengkap'}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="netral">{r.food_group_count} kelompok pangan</Badge>
        {r.animal_protein && <Badge tone="sukses">Mengandung protein hewani</Badge>}
        {r.price_stale && <Badge tone="perhatian">Harga perlu diperbarui</Badge>}
        {!r.cost_complete && <Badge tone="perhatian">Biaya belum lengkap</Badge>}
      </div>

      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        {r.reasons.map((x) => <li key={x}>{x}</li>)}
      </ul>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-daun-700">Bahan, takaran, dan biaya</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="text-redam">
              <tr><th className="py-1 pr-3">Bahan</th><th className="py-1 pr-3">Takaran</th><th className="py-1 pr-3">Kelompok</th><th className="py-1 text-right">Biaya</th></tr>
            </thead>
            <tbody className="divide-y divide-garis">
              {r.ingredients.map((i) => (
                <tr key={i.food_item_id}>
                  <td className="py-1.5 pr-3">{i.name}</td>
                  <td className="py-1.5 pr-3">{formatQty(i.quantity, i.unit)}</td>
                  <td className="py-1.5 pr-3 text-xs text-redam">{FOOD_GROUP_LABEL[i.food_group]}</td>
                  <td className="py-1.5 text-right">{i.cost === null ? 'harga belum ada' : rupiah(i.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.oldest_price_date && <p className="mt-2 text-xs text-redam">Harga terlama diperbarui {formatDate(r.oldest_price_date)}.</p>}
        </div>
      </details>
    </Card>
  );
}

const parseBudget = (s) => {
  const digits = s.replace(/[^\d]/g, '');
  return digits === '' ? null : Number(digits);
};

export default function MenuRecommendationPage() {
  const { id } = useParams();
  const [budgetInput, setBudgetInput] = useState('');
  const [budget, setBudget] = useState(null);
  const [budgetError, setBudgetError] = useState('');
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = useCallback(async () => {
    try {
      const res = await getRecommendations(id, budget);
      setState({ loading: false, error: '', data: res.data });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err), data: null });
    }
  }, [id, budget]);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
  }, [load]);

  const applyBudget = (e) => {
    e.preventDefault();
    const value = parseBudget(budgetInput);
    if (value !== null && value > 10000000) { setBudgetError('Anggaran terlalu besar'); return; }
    setBudgetError('');
    setBudget(value);
  };

  if (state.loading && !state.data) return <Spinner />;
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  const d = state.data;

  return (
    <div className="space-y-4">
      <Link to="/menu" className="text-sm text-daun-700 hover:underline">Kembali ke pilih balita</Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Rekomendasi menu: {d.child.name}</h1>
        <ValidationTag validated={d.is_validated} text="contoh, belum divalidasi ahli gizi" />
      </div>
      <p className="text-sm text-redam">Usia {formatAge(d.child.age_months)}. {d.notes[0]}</p>

      {d.message && <Alert tone="info">{d.message}</Alert>}

      {d.guidance && <Guidance g={d.guidance} />}

      {d.age_group && (
        <>
          <form onSubmit={applyBudget} className="flex flex-wrap items-end gap-2">
            <Input
              label="Anggaran per porsi (Rp, opsional)"
              inputMode="numeric"
              placeholder="Contoh: 5000"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              error={budgetError}
              className="w-full sm:w-56"
            />
            <Button type="submit" variant="secondary">Terapkan</Button>
            {budget !== null && <Button variant="ghost" onClick={() => { setBudgetInput(''); setBudget(null); }}>Hapus anggaran</Button>}
          </form>

          <section className="space-y-3">
            <h2 className="font-semibold">Menu yang direkomendasikan ({d.recommendations.length})</h2>
            {d.recommendations.length === 0 ? (
              <Alert tone="warning">Tidak ada menu yang sesuai. Coba naikkan anggaran atau periksa daftar alergi dan pantangan.</Alert>
            ) : (
              d.recommendations.map((r) => <MenuCard key={r.menu.id} r={r} />)
            )}
          </section>

          {d.excluded.length > 0 && (
            <Card>
              <h2 className="font-semibold">Tidak direkomendasikan ({d.excluded.length})</h2>
              <ul className="mt-3 divide-y divide-garis text-sm">
                {d.excluded.map((x) => (
                  <li key={x.menu.id} className="py-2">
                    <b>{x.menu.name}</b>
                    <p className="text-redam">{x.reason}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <ul className="list-disc space-y-1 pl-5 text-xs text-redam">
        {d.notes.slice(1).map((n) => <li key={n}>{n}</li>)}
      </ul>

      <AllergyEditor childId={id} onSaved={load} />
    </div>
  );
}