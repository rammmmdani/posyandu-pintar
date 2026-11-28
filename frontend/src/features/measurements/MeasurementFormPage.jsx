import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getChild } from '../../services/childrenService';
import { createMeasurement } from '../../services/measurementsService';
import { getErrorMessage } from '../../utils/errors';
import { GENDER_LABEL, formatAge, formatDate, todayISO } from '../../utils/format';
import { useOnline } from '../../hooks/useOnline';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

const toNumber = (s) => {
  const t = s.trim().replace(',', '.'); // terima koma desimal ala Indonesia
  return t === '' ? null : t;
};

function validate(form) {
  const e = {};
  const weight = toNumber(form.weight_kg);
  const height = toNumber(form.height_cm);

  if (!form.measurement_date) e.measurement_date = 'Tanggal pengukuran wajib diisi';
  else if (form.measurement_date > todayISO()) e.measurement_date = 'Tanggal tidak boleh di masa depan';

  if (weight === null && height === null) e.weight_kg = 'Isi minimal berat badan atau panjang/tinggi badan';
  if (weight !== null) {
    if (!/^\d+(\.\d{1,2})?$/.test(weight)) e.weight_kg = 'Isi angka, maksimal 2 angka di belakang koma';
    else if (Number(weight) <= 0) e.weight_kg = 'Berat badan harus lebih dari 0';
  }
  if (height !== null) {
    if (!/^\d+(\.\d)?$/.test(height)) e.height_cm = 'Isi angka, maksimal 1 angka di belakang koma';
    else if (Number(height) <= 0) e.height_cm = 'Panjang/tinggi badan harus lebih dari 0';
    if (!form.measurement_type) e.measurement_type = 'Pilih cara pengukuran';
  }
  return e;
}

export default function MeasurementFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const online = useOnline();

  const [child, setChild] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ measurement_date: todayISO(), weight_kg: '', height_cm: '', measurement_type: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getChild(id)
      .then((res) => setChild(res.data))
      .catch((err) => setLoadError(getErrorMessage(err)));
  }, [id]);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError('Periksa kembali isian yang ditandai.');
      return;
    }
    setConfirmOpen(true); // konfirmasi identitas anak sebelum menyimpan
  };

  const save = async () => {
    setSubmitting(true);
    const weight = toNumber(form.weight_kg);
    const height = toNumber(form.height_cm);
    try {
      const res = await createMeasurement(id, {
        measurement_date: form.measurement_date,
        weight_kg: weight === null ? null : Number(weight),
        height_cm: height === null ? null : Number(height),
        measurement_type: height === null ? null : form.measurement_type,
        notes: form.notes.trim() || null,
      });
      toast.success('Pengukuran berhasil disimpan');
      if (res.data.measurement.validity_status === 'perlu_diperiksa') {
        toast.info('Data ditandai perlu diperiksa dan tidak dipakai untuk penilaian. Periksa ulang pengukurannya.');
      }
      if (res.warning) toast.error(res.warning);
      navigate(`/balita/${id}`);
    } catch (err) {
      setConfirmOpen(false);
      const body = err.response?.data;
      if (body?.code === 'VALIDATION_ERROR' && body.errors?.length) {
        const mapped = {};
        for (const item of body.errors) mapped[item.field] = item.message;
        setErrors(mapped);
        setFormError('Periksa kembali isian yang ditandai.');
      } else {
        setFormError(getErrorMessage(err)); // termasuk DUPLICATE_MEASUREMENT dan CONSENT_WITHDRAWN
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) return <Alert tone="error">{loadError}</Alert>;
  if (!child) return <Spinner />;

  const blocked = child.consent_status === 'ditarik';

  return (
    <div className="max-w-3xl">
      <Link to={`/balita/${id}`} className="text-sm text-daun-700 hover:underline">
        Kembali ke detail balita
      </Link>
      <h1 className="mt-2 text-xl font-bold">Catat pengukuran</h1>

      <Card className="mt-3">
        <p className="text-sm text-redam">Pengukuran untuk</p>
        <p className="text-lg font-semibold">{child.name}</p>
        <p className="text-sm text-redam">
          {GENDER_LABEL[child.gender]}, {formatAge(child.age_months)}, wali {child.parent_name}
        </p>
      </Card>

      {blocked && (
        <Alert tone="warning" title="Persetujuan wali ditarik" className="mt-3">
          Pengukuran baru tidak dapat dicatat sampai persetujuan dicatat kembali.
        </Alert>
      )}
      {!child.birth_date && (
        <Alert tone="warning" title="Tanggal lahir belum diketahui" className="mt-3">
          Pengukuran tetap bisa disimpan, tetapi hasil penilaian tidak dapat dihitung.
        </Alert>
      )}
      {!online && (
        <Alert tone="warning" className="mt-3">
          Tidak ada koneksi internet. Pengukuran baru tidak dapat disimpan.
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        <Card className="space-y-3">
          <Input
            label="Tanggal pengukuran"
            name="measurement_date"
            type="date"
            max={todayISO()}
            value={form.measurement_date}
            onChange={onChange}
            error={errors.measurement_date}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Berat badan (kg)"
              name="weight_kg"
              inputMode="decimal"
              placeholder="Contoh: 8,4"
              value={form.weight_kg}
              onChange={onChange}
              error={errors.weight_kg}
            />
            <Input
              label="Panjang/tinggi badan (cm)"
              name="height_cm"
              inputMode="decimal"
              placeholder="Contoh: 71,5"
              value={form.height_cm}
              onChange={onChange}
              error={errors.height_cm}
            />
          </div>
          <Select
            label="Cara pengukuran panjang/tinggi"
            name="measurement_type"
            value={form.measurement_type}
            onChange={onChange}
            error={errors.measurement_type}
          >
            <option value="">Pilih (wajib jika panjang/tinggi diisi)</option>
            <option value="recumbent">Panjang badan (diukur berbaring)</option>
            <option value="standing">Tinggi badan (diukur berdiri)</option>
          </Select>
          <Input label="Catatan (opsional)" name="notes" value={form.notes} onChange={onChange} />
        </Card>

        <Button type="submit" disabled={blocked || !online}>
          Simpan pengukuran
        </Button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Simpan pengukuran ini?"
        message={`Untuk ${child.name} (${formatAge(child.age_months)}), tanggal ${formatDate(form.measurement_date)}. Berat: ${form.weight_kg.trim() || '-'} kg, panjang/tinggi: ${form.height_cm.trim() || '-'} cm. Pastikan anaknya benar.`}
        confirmLabel="Ya, simpan"
        loading={submitting}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}