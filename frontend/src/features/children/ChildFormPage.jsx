import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createChild, getChild, updateChild } from '../../services/childrenService';
import { getErrorMessage } from '../../utils/errors';
import { formatDate, todayISO } from '../../utils/format';
import { PRIVACY_NOTICE } from './privacyNotice';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Checkbox from '../../components/ui/Checkbox';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

const EMPTY = {
  name: '', birth_date: '', birth_date_unknown: false, gender: '',
  parent_name: '', parent_phone: '', address: '',
  consent_method: 'lisan', consent_agreed: false,
};

// Nama field dari server -> nama field di form.
const SERVER_FIELD_MAP = {
  'consent.method': 'consent_method',
  'consent.guardian_name': 'parent_name',
  'consent.notice_version': 'consent_agreed',
  consent: 'consent_agreed',
};

function validate(form, isEdit) {
  const e = {};
  if (!form.name.trim()) e.name = 'Nama anak wajib diisi';
  if (!form.gender) e.gender = 'Pilih jenis kelamin';
  if (!form.parent_name.trim()) e.parent_name = 'Nama wali wajib diisi';
  if (!form.birth_date_unknown) {
    if (!form.birth_date) e.birth_date = 'Isi tanggal lahir, atau centang "Tanggal lahir belum diketahui"';
    else if (form.birth_date > todayISO()) e.birth_date = 'Tanggal lahir tidak boleh di masa depan';
  }
  if (!isEdit && !form.consent_agreed) {
    e.consent_agreed = 'Persetujuan wali wajib dicatat sebelum data disimpan';
  }
  return e;
}

function buildPayload(form, isEdit, confirmDuplicate) {
  const base = {
    name: form.name.trim(),
    birth_date: form.birth_date_unknown ? null : form.birth_date || null,
    gender: form.gender,
    parent_name: form.parent_name.trim(),
    parent_phone: form.parent_phone.trim() || null,
    address: form.address.trim() || null,
  };
  if (isEdit) return base;
  return {
    ...base,
    confirm_duplicate: confirmDuplicate,
    consent: {
      guardian_name: base.parent_name,
      method: form.consent_method,
      notice_version: PRIVACY_NOTICE.version,
    },
  };
}

export default function ChildFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState([]);

  useEffect(() => {
    if (!isEdit) return;
    getChild(id)
      .then((res) => {
        const c = res.data;
        setForm({
          ...EMPTY,
          name: c.name,
          birth_date: c.birth_date || '',
          birth_date_unknown: !c.birth_date,
          gender: c.gender,
          parent_name: c.parent_name,
          parent_phone: c.parent_phone || '',
          address: c.address || '',
        });
      })
      .catch((err) => setFormError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };
  const onChange = (e) => set(e.target.name, e.target.value);

  const submit = async (confirmDuplicate = false) => {
    setFormError('');
    setSubmitting(true);
    try {
      if (isEdit) {
        const res = await updateChild(id, buildPayload(form, true));
        toast.success('Data balita diperbarui');
        if (res.warning) toast.info(res.warning);
        navigate(`/balita/${id}`);
      } else {
        const res = await createChild(buildPayload(form, false, confirmDuplicate));
        toast.success('Balita berhasil didaftarkan');
        navigate(`/balita/${res.data.id}`);
      }
    } catch (err) {
      const body = err.response?.data;
      if (body?.code === 'DUPLICATE_CHILD') {
        setDuplicates(body.data.candidates);
      } else if (body?.code === 'VALIDATION_ERROR' && body.errors?.length) {
        const mapped = {};
        for (const item of body.errors) mapped[SERVER_FIELD_MAP[item.field] || item.field] = item.message;
        setErrors(mapped);
        setFormError('Periksa kembali isian yang ditandai.');
      } else {
        setFormError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate(form, isEdit);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError('Periksa kembali isian yang ditandai.');
      return;
    }
    submit(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <Link to={isEdit ? `/balita/${id}` : '/balita'} className="text-sm text-daun-700 hover:underline">
        Kembali
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{isEdit ? 'Ubah data balita' : 'Tambah balita'}</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}

        <Card className="space-y-4">
          <h2 className="font-semibold">Data anak</h2>
          <Input label="Nama anak" name="name" value={form.name} onChange={onChange} error={errors.name} />
          <Select label="Jenis kelamin" name="gender" value={form.gender} onChange={onChange} error={errors.gender}>
            <option value="">Pilih</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </Select>
          <div>
            <Input
              label="Tanggal lahir"
              name="birth_date"
              type="date"
              max={todayISO()}
              value={form.birth_date}
              onChange={onChange}
              disabled={form.birth_date_unknown}
              error={errors.birth_date}
            />
            <Checkbox
              className="mt-2"
              label="Tanggal lahir belum diketahui"
              checked={form.birth_date_unknown}
              onChange={(e) => {
                set('birth_date_unknown', e.target.checked);
                if (e.target.checked) set('birth_date', '');
              }}
            />
            {form.birth_date_unknown && (
              <Alert tone="warning" className="mt-2">
                Tanpa tanggal lahir, hasil penilaian pertumbuhan tidak dapat dihitung.
              </Alert>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold">Data wali</h2>
          <Input label="Nama wali" name="parent_name" value={form.parent_name} onChange={onChange} error={errors.parent_name} />
          <Input label="Nomor telepon (opsional)" name="parent_phone" type="tel" value={form.parent_phone} onChange={onChange} />
          <Input label="Alamat (opsional)" name="address" value={form.address} onChange={onChange} />
        </Card>

        {!isEdit && (
          <Card className="space-y-4">
            <h2 className="font-semibold">Persetujuan wali</h2>
            <div className="rounded-lg bg-kertas p-4 text-sm">
              <p className="font-semibold">{PRIVACY_NOTICE.title}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-redam">
                {PRIVACY_NOTICE.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-redam">Versi {PRIVACY_NOTICE.version}. Teks draf, belum ditinjau.</p>
            </div>
            <Select label="Cara persetujuan diberikan" name="consent_method" value={form.consent_method} onChange={onChange}>
              <option value="lisan">Lisan</option>
              <option value="tertulis">Tertulis</option>
            </Select>
            <Checkbox
              label="Pemberitahuan di atas sudah dijelaskan kepada wali dan wali menyatakan setuju."
              checked={form.consent_agreed}
              onChange={(e) => set('consent_agreed', e.target.checked)}
              error={errors.consent_agreed}
            />
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Simpan perubahan' : 'Daftarkan balita'}
          </Button>
          <Link to={isEdit ? `/balita/${id}` : '/balita'} className="inline-flex items-center px-4 text-sm font-semibold text-redam hover:text-tinta">
            Batal
          </Link>
        </div>
      </form>

      <Modal
        open={duplicates.length > 0}
        onClose={() => setDuplicates([])}
        title="Kemungkinan balita sudah terdaftar"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDuplicates([])}>
              Periksa lagi
            </Button>
            <Button
              loading={submitting}
              onClick={() => {
                setDuplicates([]);
                submit(true);
              }}
            >
              Ini anak berbeda, tetap daftarkan
            </Button>
          </>
        }
      >
        <p className="text-sm text-redam">
          Sudah ada balita dengan nama, jenis kelamin, dan tanggal lahir yang sama:
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {duplicates.map((d) => (
            <li key={d.id} className="rounded-lg border border-garis p-3">
              <Link to={`/balita/${d.id}`} className="font-semibold text-daun-700 hover:underline" target="_blank">
                {d.name}
              </Link>
              <p className="text-redam">
                Lahir {formatDate(d.birth_date)}, wali {d.parent_name}
              </p>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}