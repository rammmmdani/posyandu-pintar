import { useCallback, useEffect, useState } from "react";
import { createUser, getUsers, updateUser } from "../../services/usersService";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../utils/errors";
import { formatDate } from "../../utils/format";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import { useToast } from "../../components/ui/Toast";

const EMPTY = { name: "", email: "", password: "", role: "kader" };

export default function AccountsPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [state, setState] = useState({
    loading: true,
    error: "",
    rows: [],
    meta: null,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [resetFor, setResetFor] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [toggleFor, setToggleFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getUsers({ page });
      setState({ loading: false, error: "", rows: res.data, meta: res.meta });
    } catch (err) {
      setState({
        loading: false,
        error: getErrorMessage(err),
        rows: [],
        meta: null,
      });
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const submitCreate = async () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nama wajib diisi";
    if (!form.email.trim()) e.email = "Email wajib diisi";
    if (form.password.length < 8) e.password = "Password minimal 8 karakter";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await createUser({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
      });
      toast.success("Akun dibuat");
      setCreateOpen(false);
      setForm(EMPTY);
      await load();
    } catch (err) {
      const body = err.response?.data;
      if (body?.errors?.length)
        setErrors(
          Object.fromEntries(body.errors.map((x) => [x.field, x.message])),
        );
      else toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    if (newPassword.length < 8) {
      setResetError("Password minimal 8 karakter");
      return;
    }
    setBusy(true);
    try {
      await updateUser(resetFor.id, { password: newPassword });
      toast.success(
        "Password diganti. Sampaikan kepada pemilik akun melalui kanal yang aman.",
      );
      setResetFor(null);
      setNewPassword("");
    } catch (err) {
      setResetError(
        err.response?.data?.errors?.[0]?.message || getErrorMessage(err),
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmToggle = async () => {
    setBusy(true);
    try {
      await updateUser(toggleFor.id, { is_active: !toggleFor.is_active });
      toast.success(
        toggleFor.is_active ? "Akun dinonaktifkan" : "Akun diaktifkan",
      );
      setToggleFor(null);
      await load();
    } catch (err) {
      toast.error(
        err.response?.data?.errors?.[0]?.message || getErrorMessage(err),
      );
      setToggleFor(null);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Nama",
      render: (u) => (
        <b>
          {u.name}
          {u.id === me.id && (
            <span className="ml-2 text-xs font-normal text-redam">(Anda)</span>
          )}
        </b>
      ),
    },
    { key: "email", header: "Email" },
    { key: "role", header: "Peran", className: "capitalize" },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <Badge tone={u.is_active ? "sukses" : "netral"}>
          {u.is_active ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    {
      key: "last",
      header: "Login terakhir",
      render: (u) =>
        u.last_login_at ? formatDate(u.last_login_at) : "Belum pernah",
    },
    {
      key: "action",
      header: "",
      render: (u) => (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setResetFor(u);
              setNewPassword("");
              setResetError("");
            }}
          >
            Ganti password
          </Button>
          {u.id !== me.id && (
            <Button
              variant={u.is_active ? "danger" : "secondary"}
              onClick={() => setToggleFor(u)}
            >
              {u.is_active ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pengaturan Akun</h1>
        <Button
          onClick={() => {
            setErrors({});
            setCreateOpen(true);
          }}
        >
          Tambah akun
        </Button>
      </div>
      <p className="text-sm text-redam">
        Hanya koordinator yang dapat membuat akun. Akun yang dinonaktifkan
        langsung tidak dapat masuk atau memakai sesi yang masih berjalan.
      </p>

      {state.error ? (
        <Alert tone="error">{state.error}</Alert>
      ) : (
        <>
          <Table
            columns={columns}
            rows={state.rows}
            loading={state.loading}
            emptyTitle="Belum ada akun"
          />
          <Pagination meta={state.meta} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tambah akun"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={busy}
            >
              Batal
            </Button>
            <Button onClick={submitCreate} loading={busy}>
              Buat akun
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nama"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <Input
            label="Password awal"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            hint="Minimal 8 karakter. Sampaikan melalui kanal yang aman."
          />
          <Select
            label="Peran"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="kader">Kader</option>
            <option value="koordinator">Koordinator</option>
          </Select>
        </div>
      </Modal>

      <Modal
        open={resetFor !== null}
        onClose={() => setResetFor(null)}
        title={resetFor ? `Ganti password ${resetFor.name}` : ""}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setResetFor(null)}
              disabled={busy}
            >
              Batal
            </Button>
            <Button onClick={submitReset} loading={busy}>
              Simpan password
            </Button>
          </>
        }
      >
        <Input
          label="Password baru"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setResetError("");
          }}
          error={resetError}
        />
      </Modal>

      <ConfirmDialog
        open={toggleFor !== null}
        title={
          toggleFor?.is_active ? "Nonaktifkan akun ini?" : "Aktifkan akun ini?"
        }
        message={
          toggleFor?.is_active
            ? `${toggleFor?.name} tidak dapat masuk lagi dan sesi yang sedang berjalan langsung berakhir.`
            : `${toggleFor?.name} dapat masuk kembali.`
        }
        confirmLabel={toggleFor?.is_active ? "Nonaktifkan" : "Aktifkan"}
        tone={toggleFor?.is_active ? "danger" : "primary"}
        loading={busy}
        onConfirm={confirmToggle}
        onCancel={() => setToggleFor(null)}
      />
    </div>
  );
}
