import { useEffect, useState } from 'react';
import { getAllergies, getFoodItems, saveAllergies } from '../../services/menusService';
import { getErrorMessage } from '../../utils/errors';
import { useOnline } from '../../hooks/useOnline';
import { ALLERGEN_LABEL } from './menuLabels';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

const keyOf = (i) => `${i.food_item_id ?? ''}|${i.allergen_tag ?? ''}`;

// Setelah disimpan, onSaved() dipanggil agar rekomendasi dimuat ulang.
export default function AllergyEditor({ childId, onSaved }) {
  const toast = useToast();
  const online = useOnline();
  const [state, setState] = useState({ loading: true, error: '' });
  const [items, setItems] = useState([]);
  const [foods, setFoods] = useState([]);
  const [tag, setTag] = useState('');
  const [food, setFood] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getAllergies(childId), getFoodItems()])
      .then(([a, f]) => {
        setItems(a.data.map((x) => ({ food_item_id: x.food_item?.id ?? null, food_name: x.food_item?.name ?? null, allergen_tag: x.allergen_tag, note: x.note })));
        setFoods(f.data.filter((x) => x.is_active));
        setState({ loading: false, error: '' });
      })
      .catch((err) => setState({ loading: false, error: getErrorMessage(err) }));
  }, [childId]);

  const add = (entry) => {
    if (items.some((i) => keyOf(i) === keyOf(entry))) return;
    setItems([...items, entry]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveAllergies(childId, items.map((i) => ({ food_item_id: i.food_item_id, allergen_tag: i.allergen_tag, note: i.note ?? null })));
      toast.success('Alergi dan pantangan disimpan');
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (state.loading) return <Spinner />;
  if (state.error) return <Alert tone="error">{state.error}</Alert>;

  return (
    <Card>
      <h2 className="font-semibold">Alergi dan pantangan</h2>
      <p className="mt-1 text-sm text-redam">Menu yang mengandung bahan di bawah ini tidak akan direkomendasikan.</p>

      <ul className="mt-3 flex flex-wrap gap-2">
        {items.length === 0 && <li className="text-sm text-redam">Belum ada yang dicatat.</li>}
        {items.map((i) => (
          <li key={keyOf(i)} className="flex items-center gap-2 rounded-full border border-garis bg-kertas px-3 py-1 text-sm">
            <span>{i.allergen_tag ? `Kategori: ${ALLERGEN_LABEL[i.allergen_tag]}` : `Bahan: ${i.food_name}`}</span>
            <button type="button" aria-label="Hapus" className="p-2 font-bold text-redam hover:text-tinta sm:p-1.5" onClick={() => setItems(items.filter((x) => keyOf(x) !== keyOf(i)))}>
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-end gap-2">
          <Select label="Tambah kategori" value={tag} onChange={(e) => setTag(e.target.value)} className="flex-1">
            <option value="">Pilih kategori</option>
            {Object.entries(ALLERGEN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Button variant="secondary" disabled={!tag} onClick={() => { add({ food_item_id: null, food_name: null, allergen_tag: tag, note: null }); setTag(''); }}>Tambah</Button>
        </div>
        <div className="flex items-end gap-2">
          <Select label="Tambah bahan tertentu" value={food} onChange={(e) => setFood(e.target.value)} className="flex-1">
            <option value="">Pilih bahan</option>
            {foods.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Button
            variant="secondary"
            disabled={!food}
            onClick={() => {
              const f = foods.find((x) => String(x.id) === food);
              add({ food_item_id: f.id, food_name: f.name, allergen_tag: null, note: null });
              setFood('');
            }}
          >
            Tambah
          </Button>
        </div>
      </div>

      {!online && <Alert tone="warning" className="mt-3">Tidak ada koneksi internet. Perubahan tidak dapat disimpan.</Alert>}
      <Button className="mt-3" loading={saving} disabled={!online} onClick={save}>Simpan alergi dan pantangan</Button>
    </Card>
  );
}