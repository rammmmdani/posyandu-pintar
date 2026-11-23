import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addFollowUp, getAlert, updateAlertStatus } from '../../services/alertsService';
import { getErrorMessage } from '../../utils/errors';
import { formatDate, todayISO } from '../../utils/format';
import { useOnline } from '../../hooks/useOnline';
import { AssessmentSummary } from '../children/ChildGrowthSection';
import { REFERRAL, SeverityBadge, StatusBadge, ValidationTag } from './alertLabels';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import Table from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';

export default function AlertDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const online = useOnline();
  const [state, setState] = useState({ loading: true, error: '', alert: null });
  const [fu, setFu] = useState({ action_date: todayISO(), action_note: '', referral_status: 'tidak_dirujuk' });
  const [fuErrors, setFuErrors] = useState({});
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeNote, setCloseNote] = useState('');
  const [closeError, setCloseError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getAlert(id);
      setState({ loading: false, error: '', alert: res.data });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err), alert: null });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const { loading, error, alert } = state;
  if (loading) return <Spinner />;
  if (error) {
    return (
      <div>
        <Alert tone="error">{error}</Alert>
        <Link to="/peringatan" className="mt-4 inline-block text-sm text-daun-700 hover:underline">Kembali ke daftar peringatan</Link>
      </div>
    );
  }

  const closed = alert.status === 'ditutup';

  const changeStatus = async (payload) => {
    setBusy(true);
    try {
      await updateAlertStatus(id, payload);
      toast.success('Status peringatan diperbarui');
      return true;
    } catch (err) {
      const body = err.response?.data;
      if (body?.errors?.length) setCloseError(body.errors[0].message);
      else toast.error(getErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitFollowUp = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!fu.action_date) errs.action_date = 'Tanggal wajib diisi';
    else if (fu.action_date > todayISO()) errs.action_date = 'Tanggal tidak boleh di masa depan';
    if (!fu.action_note.trim()) errs.action_note = 'Catatan tindakan wajib diisi';
    setFuErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      await addFollowUp(id, { ...fu, action_note: fu.action_note.trim() });
      toast.success('Tindak lanjut dicatat');
      setFu({ action_date: todayISO(), action_note: '', referral_status: 'tidak_dirujuk' });
      await load();
    } catch (err) {
      const body = err.response?.data;
      if (body?.errors?.length) setFuErrors(Object.fromEntries(body.errors.map((x) => [x.field, x.message])));
      else toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const followColumns = [
    { key: 'action_date', header: 'Tanggal', render: (f) => formatDate(f.action_date) },
    { key: 'action_note', header: 'Tindakan', className: 'max-w-sm' },
    { key: 'referral_status', header: 'Rujukan', render: (f) => REFERRAL[f.referral_status] },
    { key: 'recorded_by', header: 'Dicatat oleh', render: (f) => f.recorded_by.name },
  ];

  return (
    <div className="space-y-5">
      <Link to="/peringatan" className="text-sm text-daun-700 hover:underline">Kembali ke daftar peringatan</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            <Link to={`/balita/${alert.child.id}`} className="hover:underline">{alert.child.name}</Link>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <StatusBadge status={alert.status} />
            <ValidationTag validated={alert.is_validated} />
            <span className="text-xs text-redam">{formatDate(alert.created_at)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {alert.status === 'baru' && (
            <Button variant="secondary" loading={busy} onClick={async () => { if (await changeStatus({ status: 'dilihat' })) load(); }}>
              Tandai sudah dilihat
            </Button>
          )}
          {closed ? (
            <Button variant="secondary" loading={busy} onClick={async () => { if (await changeStatus({ status: 'dilihat' })) load(); }}>
              Buka kembali
            </Button>
          ) : (
            <Button variant="danger" onClick={() => { setCloseNote(''); setCloseError(''); setCloseOpen(true); }}>
              Tutup peringatan
            </Button>
          )}
        </div>
      </div>

      <Card className="border-l-4 border-l-amber-600">
        <p className="font-semibold">{alert.message}</p>
        <p className="mt-2 text-sm">{alert.recommendation}</p>
        {closed && alert.status_note && <p className="mt-3 text-sm text-redam">Catatan penutupan: {alert.status_note}</p>}
      </Card>

      {alert.assessment && <AssessmentSummary assessment={alert.assessment} />}

      <section>
        <h2 className="mb-3 font-semibold">Riwayat tindak lanjut</h2>
        <Table columns={followColumns} rows={alert.follow_ups} emptyTitle="Belum ada tindak lanjut" />
      </section>

      {!closed && (
        <Card>
          <h2 className="font-semibold">Catat tindak lanjut</h2>
          <form onSubmit={submitFollowUp} noValidate className="mt-3 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Tanggal tindakan" type="date" max={todayISO()} value={fu.action_date}
                onChange={(e) => { setFu({ ...fu, action_date: e.target.value }); setFuErrors({ ...fuErrors, action_date: undefined }); }}
                error={fuErrors.action_date} />
              <Select label="Status rujukan" value={fu.referral_status} onChange={(e) => setFu({ ...fu, referral_status: e.target.value })}>
                {Object.entries(REFERRAL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
            <Input label="Catatan tindakan" value={fu.action_note}
              onChange={(e) => { setFu({ ...fu, action_note: e.target.value }); setFuErrors({ ...fuErrors, action_note: undefined }); }}
              error={fuErrors.action_note} hint="Contoh: wali diberi penjelasan dan diarahkan ke puskesmas" />
            {!online && <Alert tone="warning">Tidak ada koneksi internet. Tindak lanjut tidak dapat disimpan.</Alert>}
            <Button type="submit" loading={busy} disabled={!online}>Simpan tindak lanjut</Button>
          </form>
        </Card>
      )}

      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Tutup peringatan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCloseOpen(false)} disabled={busy}>Batal</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                if (!closeNote.trim()) { setCloseError('Catatan wajib diisi saat menutup peringatan'); return; }
                if (await changeStatus({ status: 'ditutup', note: closeNote.trim() })) { setCloseOpen(false); load(); }
              }}
            >
              Tutup peringatan
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-redam">Jelaskan alasan penutupan, misalnya sudah ditangani atau data pengukuran keliru.</p>
        <Input label="Catatan" value={closeNote} onChange={(e) => { setCloseNote(e.target.value); setCloseError(''); }} error={closeError} />
      </Modal>
    </div>
  );
}