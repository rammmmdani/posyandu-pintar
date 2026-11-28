
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  addConsent,
  deleteChild,
  getChild,
  getConsents,
  setChildStatus,
} from '../../services/childrenService';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/errors';
import { GENDER_LABEL, formatAge, formatDate } from '../../utils/format';
import { PRIVACY_NOTICE } from './privacyNotice';
import ChildGrowthSection from './ChildGrowthSection';
import ChildAlertsCard from './ChildAlertsCard';

import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button, { buttonClass } from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Checkbox from '../../components/ui/Checkbox';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import Table from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';

const CONSENT_LABEL = {
  diberikan: 'Diberikan',
  ditarik: 'Ditarik',
};

const CONSENT_METHOD_LABEL = {
  lisan: 'Lisan',
  tertulis: 'Tertulis',
  checklist: 'Centang persetujuan',
};

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
  const navigate = useNavigate();
  const { isKoordinator } = useAuth();
  const toast = useToast();

  const [state, setState] = useState({
    loading: true,
    error: '',
    child: null,
    consents: [],
  });

  const [confirmStatus, setConfirmStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [consentAction, setConsentAction] = useState(null);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, k] = await Promise.all([
        getChild(id),
        getConsents(id),
      ]);

      setState({
        loading: false,
        error: '',
        child: c.data,
        consents: k.data,
      });
    } catch (err) {
      setState({
        loading: false,
        error: getErrorMessage(err),
        child: null,
        consents: [],
      });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const { loading, error, child, consents } = state;

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div>
        <Alert tone="error">{error}</Alert>

        <Link
          to="/balita"
          className="mt-4 inline-block text-sm text-daun-700 hover:underline"
        >
          Kembali ke Data Balita
        </Link>
      </div>
    );
  }

  const isActive = child.status === 'aktif';

  const closeConsent = () => {
    setConsentAction(null);
    setConsentAgreed(false);
  };

  const toggleStatus = async () => {
    setBusy(true);

    try {
      await setChildStatus(
        id,
        isActive ? 'nonaktif' : 'aktif'
      );

      toast.success(
        isActive
          ? 'Balita dinonaktifkan'
          : 'Balita diaktifkan kembali'
      );

      setConfirmStatus(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const removeChild = async () => {
    setBusy(true);

    try {
      await deleteChild(id);
      toast.success('Balita berhasil dihapus');
      navigate('/balita');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitConsent = async () => {
    if (consentAction === 'diberikan' && !consentAgreed) {
      toast.error('Centang persetujuan wali sebelum menyimpan');
      return;
    }

    setBusy(true);

    try {
      await addConsent(id, {
        consent_status: consentAction,
        guardian_name: child.parent_name,
        notice_version: PRIVACY_NOTICE.version,
      });

      toast.success(
        consentAction === 'ditarik'
          ? 'Penarikan persetujuan dicatat'
          : 'Persetujuan dicatat'
      );

      closeConsent();
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const consentColumns = [
    {
      key: 'status',
      header: 'Status',
      render: (c) => CONSENT_LABEL[c.consent_status],
    },
    {
      key: 'when',
      header: 'Tanggal',
      render: (c) =>
        formatDate(c.consented_at || c.withdrawn_at),
    },
    {
      key: 'method',
      header: 'Cara',
      render: (c) => CONSENT_METHOD_LABEL[c.method] || c.method || '-',
    },
    {
      key: 'notice_version',
      header: 'Versi teks',
    },
    {
      key: 'by',
      header: 'Dicatat oleh',
      render: (c) => c.recorded_by.name,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Kembali */}
      <Link
        to="/balita"
        className="text-sm text-daun-700 hover:underline"
      >
        Kembali ke Data Balita
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">
            {child.name}
          </h1>

          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={isActive ? 'sukses' : 'netral'}>
              {isActive ? 'Aktif' : 'Nonaktif'}
            </Badge>

            <Badge
              tone={
                child.consent_status === 'diberikan'
                  ? 'sukses'
                  : child.consent_status === 'ditarik'
                    ? 'tindak'
                    : 'perhatian'
              }
            >
              {child.consent_status === 'diberikan'
                ? 'Persetujuan ada'
                : child.consent_status === 'ditarik'
                  ? 'Persetujuan ditarik'
                  : 'Belum ada persetujuan'}
            </Badge>
          </div>
        </div>

        {/* Tombol kanan atas */}
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/balita/${id}/ubah`}
            className={buttonClass('secondary')}
          >
            Ubah data
          </Link>

          {child.consent_status !== 'ditarik' && (
            <Link
              to={`/balita/${id}/pengukuran/baru`}
              className={buttonClass('primary')}
            >
              Tambah pengukuran
            </Link>
          )}

          <Button
            variant={isActive ? 'danger' : 'secondary'}
            onClick={() => setConfirmStatus(true)}
          >
            {isActive
              ? 'Nonaktifkan'
              : 'Aktifkan kembali'}
          </Button>

          {isKoordinator && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Hapus balita
            </Button>
          )}
        </div>
      </div>

      {/* Alert persetujuan ditarik */}
      {child.consent_status === 'ditarik' && (
        <Alert
          tone="warning"
          title="Persetujuan wali ditarik"
        >
          Pengukuran baru tidak dapat dicatat sampai
          persetujuan dicatat kembali.
        </Alert>
      )}

      {/* Alert tanggal lahir */}
      {!child.birth_date && (
        <Alert
          tone="warning"
          title="Tanggal lahir belum diketahui"
        >
          Hasil penilaian pertumbuhan tidak dapat dihitung.
          Ubah data setelah tanggal lahir diketahui.
        </Alert>
      )}

      {/* Data anak dan wali */}
      <Card>
        <h2 className="font-semibold">
          Data anak dan wali
        </h2>

        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Jenis kelamin">
            {GENDER_LABEL[child.gender]}
          </Field>

          <Field label="Tanggal lahir">
            {child.birth_date
              ? formatDate(child.birth_date)
              : 'Belum diketahui'}
          </Field>

          <Field label="Usia">
            {formatAge(child.age_months)}
          </Field>

          <Field label="Nama wali">
            {child.parent_name}
          </Field>

          <Field label="Telepon wali">
            {child.parent_phone}
          </Field>

          <Field label="Alamat">
            {child.address}
          </Field>

          <Field label="RT">
            {child.rt}
          </Field>

          <Field label="RW">
            {child.rw}
          </Field>
        </dl>
      </Card>

      {/* Kartu peringatan */}
      <ChildAlertsCard childId={id} />

      {/* Pengukuran / pertumbuhan */}
      <ChildGrowthSection
        childId={id}
        latest={child.latest_measurement}
      />

      {/* Riwayat persetujuan */}
      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            Riwayat persetujuan wali
          </h2>

          {child.consent_status === 'diberikan' ? (
            <Button
              variant="secondary"
              onClick={() => {
                setConsentAgreed(false);
                setConsentAction('ditarik');
              }}
            >
              Catat penarikan persetujuan
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setConsentAgreed(false);
                setConsentAction('diberikan');
              }}
            >
              Catat persetujuan baru
            </Button>
          )}
        </div>

        <Table
          columns={consentColumns}
          rows={consents}
          emptyTitle="Belum ada catatan persetujuan"
        />
      </section>

      {/* Dialog status */}
      <ConfirmDialog
        open={confirmStatus}
        title={
          isActive
            ? 'Nonaktifkan balita ini?'
            : 'Aktifkan balita ini kembali?'
        }
        message={
          isActive
            ? 'Balita tidak akan muncul di daftar aktif. Riwayat pengukuran tetap tersimpan.'
            : 'Balita akan muncul kembali di daftar aktif.'
        }
        confirmLabel={
          isActive
            ? 'Nonaktifkan'
            : 'Aktifkan'
        }
        tone={isActive ? 'danger' : 'primary'}
        loading={busy}
        onConfirm={toggleStatus}
        onCancel={() => setConfirmStatus(false)}
      />

      {/* Dialog hapus */}
      <ConfirmDialog
        open={confirmDelete}
        title="Hapus balita ini?"
        message="Balita akan disembunyikan dari daftar dan laporan. Riwayat tetap tersimpan dan dapat dipulihkan oleh koordinator."
        confirmLabel="Hapus balita"
        tone="danger"
        loading={busy}
        onConfirm={removeChild}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Modal persetujuan */}
      <Modal
        open={consentAction !== null}
        onClose={closeConsent}
        title={
          consentAction === 'ditarik'
            ? 'Catat penarikan persetujuan'
            : 'Catat persetujuan baru'
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeConsent}
              disabled={busy}
            >
              Batal
            </Button>

            <Button
              variant={
                consentAction === 'ditarik'
                  ? 'danger'
                  : 'primary'
              }
              onClick={submitConsent}
              loading={busy}
            >
              {consentAction === 'ditarik'
                ? 'Catat penarikan'
                : 'Catat persetujuan'}
            </Button>
          </>
        }
      >
        {consentAction === 'ditarik' ? (
          <p className="text-sm text-redam">
            Setelah penarikan dicatat, pengukuran baru untuk anak ini tidak dapat disimpan.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-redam">
              Pastikan wali membaca pemberitahuan privasi berikut.
            </p>
            <div className="rounded-lg bg-kertas p-4 text-sm">
              <p className="font-semibold">{PRIVACY_NOTICE.title}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-redam">
                {PRIVACY_NOTICE.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-redam">Versi {PRIVACY_NOTICE.version}. Teks draf, belum ditinjau.</p>
            </div>
            <Checkbox
              label="Wali telah membaca pemberitahuan di atas dan menyetujuinya."
              checked={consentAgreed}
              onChange={(e) => setConsentAgreed(e.target.checked)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
