import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../utils/errors";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-daun-700">Posyandu Pintar</h1>
        <p className="mt-2 text-redam">
          Masuk dengan akun yang dibuat oleh koordinator.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-3 rounded-xl border border-garis bg-white p-5"
        >
          {error && <Alert tone="error">{error}</Alert>}
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={form.email}
            onChange={handleChange}
          />
          <Input
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={form.password}
            onChange={handleChange}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                aria-pressed={showPassword}
                className="rounded p-3 sm:p-2 text-redam transition-colors hover:text-tinta"
              >
                {showPassword ? (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            }
          />
          <Button type="submit" loading={submitting} className="w-full">
            Masuk
          </Button>
        </form>

        <p className="mt-3 text-xs text-redam">
          Aplikasi ini alat bantu pencatatan dan pemantauan, bukan pengganti
          penilaian tenaga kesehatan.
        </p>
      </div>
    </main>
  );
}
