import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addConsent, getChild, getConsents, setChildStatus } from '../../services/childrenService';
import { getErrorMessage } from '../../utils/errors';
import { GENDER_LABEL, formatAge, formatDate } from '../../utils/format';
import { PRIVACY_NOTICE } from './privacyNotice';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button, { buttonClass } from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import Table from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';

const CONSENT_LABEL = { diberikan: 'Diberikan', ditarik: 'Ditarik' };

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-redam">{label}</dt>
      <dd className="mt-0.5 font-medium">{children || '-'}</dd>
    </div>
  );
}

export default function ChildDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: '', child: null, consents: [] });
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [consentAction, setConsentAction] = useState(null); // 'ditarik' | 'diberikan' | null
  const [consentMethod, setConsentMethod] = useState('lisan');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, k] = await Promise.all([getChild(id), getConsents(id)]);
      setState({ loading: false, error: '', child: c.data, consents: k.data });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err), child: null, consents: [] });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const { loading, error, child, consents } = state;
  if (loading) return <Spinner />;
  if (error) {
    return (
      <div>
        <Alert tone="error">{error}</Alert>
        <Link to="/balita" className="mt-4 inline-block text-sm text-daun-700 hover:underline">
          Kembali ke Data Balita
        </Link>
      </div>
    );
  }

  const isActive = child.status === 'aktif';

  const toggleStatus = async () => {
    setBusy(true);
    try {
      await setChildStatus(id, isActive ? 'nonaktif' : 'aktif');
      toast.success(isActive ? 'Balita dinonaktifkan' : 'Balita diaktifkan kembali');
      setConfirmStatus(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitConsent = async () => {
    setBusy(true);
    try {
      await addConsent(id, {
        consent_status: consentAction,
        guardian_name: child.parent_name,
        method: consentMethod,
        notice_version: PRIVACY_NOTICE.version,
      });
      toast.success(consentAction === 'ditarik' ? 'Penarikan persetujuan dicatat' : 'Persetujuan dicatat');
      setConsentAction(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const consentColumns = [
    { key: 'status', header: 'Status', render: (c) => CONSENT_LABEL[c.consent_status] },
    { key: 'when', header: 'Tanggal', render: (c) => formatDate(c.consented_at || c.withdrawn_at) },
    { key: 'method', header: 'Cara', className: 'capitalize' },
    { key: 'notice_version', header: 'Versi teks' },
    { key: 'by', header: 'Dicatat oleh', render: (c) => c.recorded_by.name },
  ];

  const latest = child.latest_measurement;

  return (
    <div className="space-y-5">
      <Link to="/balita" className="text-sm text-daun-700 hover:underline">
        Kembali ke Data Balita
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{child.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={isActive ? 'sukses' : 'netral'}>{isActive ? 'Aktif' : 'Nonaktif'}</Badge>
            <Badge tone={child.consent_status === 'diberikan' ? 'sukses' : child.consent_status === 'ditarik' ? 'tindak' : 'perhatian'}>
              {child.consent_status === 'diberikan' ? 'Persetujuan ada' : child.consent_status === 'ditarik' ? 'Persetujuan ditarik' : 'Belum ada persetujuan'}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/balita/${id}/ubah`} className={buttonClass('secondary')}>
            Ubah data
          </Link>
          <Button variant={isActive ? 'danger' : 'secondary'} onClick={() => setConfirmStatus(true)}>
            {isActive ? 'Nonaktifkan' : 'Aktifkan kembali'}
          </Button>
        </div>
      </div>

      {child.consent_status === 'ditarik' && (
        <Alert tone="warning" title="Persetujuan wali ditarik">
          Pengukuran baru tidak dapat dicatat sampai persetujuan dicatat kembali.
        </Alert>
      )}
      {!child.birth_date && (
        <Alert tone="warning" title="Tanggal lahir belum diketahui">
          Hasil penilaian pertumbuhan tidak dapat dihitung. Ubah data setelah tanggal lahir diketahui.
        </Alert>
      )}

      <Card>
        <h2 className="font-semibold">Data anak dan wali</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Jenis kelamin">{GENDER_LABEL[child.gender]}</Field>
          <Field label="Tanggal lahir">{child.birth_date ? formatDate(child.birth_date) : 'Belum diketahui'}</Field>
          <Field label="Usia">{formatAge(child.age_months)}</Field>
          <Field label="Nama wali">{child.parent_name}</Field>
          <Field label="Telepon wali">{child.parent_phone}</Field>
          <Field label="Alamat">{child.address}</Field>
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold">Pengukuran terakhir</h2>
        {latest ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Tanggal">{formatDate(latest.measurement_date)}</Field>
            <Field label="Berat badan">{latest.weight_kg !== null && `${latest.weight_kg} kg`}</Field>
            <Field label="Panjang/tinggi badan">{latest.height_cm !== null && `${latest.height_cm} cm`}</Field>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-redam">Belum ada pengukuran. Riwayat dan grafik akan tampil di sini.</p>
        )}
      </Card>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Riwayat persetujuan wali</h2>
          {child.consent_status === 'diberikan' ? (
            <Button variant="secondary" onClick={() => setConsentAction('ditarik')}>
              Catat penarikan persetujuan
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setConsentAction('diberikan')}>
              Catat persetujuan baru
            </Button>
          )}
        </div>
        <Table columns={consentColumns} rows={consents} emptyTitle="Belum ada catatan persetujuan" />
      </section>

      <ConfirmDialog
        open={confirmStatus}
        title={isActive ? 'Nonaktifkan balita ini?' : 'Aktifkan balita ini kembali?'}
        message={
          isActive
            ? 'Balita tidak akan muncul di daftar aktif. Riwayat pengukuran tetap tersimpan.'
            : 'Balita akan muncul kembali di daftar aktif.'
        }
        confirmLabel={isActive ? 'Nonaktifkan' : 'Aktifkan'}
        tone={isActive ? 'danger' : 'primary'}
        loading={busy}
        onConfirm={toggleStatus}
        onCancel={() => setConfirmStatus(false)}
      />

      <Modal
        open={consentAction !== null}
        onClose={() => setConsentAction(null)}
        title={consentAction === 'ditarik' ? 'Catat penarikan persetujuan' : 'Catat persetujuan baru'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConsentAction(null)} disabled={busy}>
              Batal
            </Button>
            <Button variant={consentAction === 'ditarik' ? 'danger' : 'primary'} onClick={submitConsent} loading={busy}>
              {consentAction === 'ditarik' ? 'Catat penarikan' : 'Catat persetujuan'}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-redam">
          {consentAction === 'ditarik'
            ? 'Setelah penarikan dicatat, pengukuran baru untuk anak ini tidak dapat disimpan.'
            : 'Pastikan pemberitahuan privasi sudah dijelaskan kepada wali.'}
        </p>
        <Select label="Cara disampaikan wali" value={consentMethod} onChange={(e) => setConsentMethod(e.target.value)}>
          <option value="lisan">Lisan</option>
          <option value="tertulis">Tertulis</option>
        </Select>
      </Modal>
    </div>
  );
}