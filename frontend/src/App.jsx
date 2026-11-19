import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./services/api";

function HealthCheckPage() {
  const [state, setState] = useState({ loading: true, ok: false, message: "" });

  useEffect(() => {
    api
      .get("/health")
      .then((res) =>
        setState({ loading: false, ok: true, message: res.data.message }),
      )
      .catch(() =>
        setState({
          loading: false,
          ok: false,
          message: "Tidak dapat terhubung ke backend",
        }),
      );
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-teal-700">
          Posyandu Pintar
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Uji koneksi frontend dan backend
        </p>
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium ${
            state.loading
              ? "bg-slate-100 text-slate-600"
              : state.ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
          }`}
        >
          {state.loading
            ? "Memeriksa..."
            : state.ok
              ? `Terhubung: ${state.message}`
              : state.message}
        </p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HealthCheckPage />} />
    </Routes>
  );
}
