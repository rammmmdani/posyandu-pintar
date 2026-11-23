import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./features/auth/LoginPage";
import PlaceholderPage from "./components/PlaceholderPage";
import ChildrenPage from './features/children/ChildrenPage';
import ChildFormPage from './features/children/ChildFormPage';
import ChildDetailPage from './features/children/ChildDetailPage';
import ChildPickerPage from './features/children/ChildPickerPage';
import MeasurementFormPage from './features/measurements/MeasurementFormPage';

// Kader mendarat di Data Balita, koordinator di Dashboard.
function HomeRedirect() {
  const { isKoordinator } = useAuth();
  return <Navigate to={isKoordinator ? "/dashboard" : "/balita"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomeRedirect />} />
          <Route path="balita" element={<ChildrenPage />} />
          <Route path="balita/baru" element={<ChildFormPage />} />
          <Route path="balita/:id" element={<ChildDetailPage />} />
          <Route path="balita/:id/ubah" element={<ChildFormPage />} />
          <Route path="balita/:id/pengukuran/baru" element={<MeasurementFormPage />} />
          <Route path="pengukuran" element={<PlaceholderPage title="Pengukuran" />} />
          <Route path="pengukuran" element={<ChildPickerPage title="Pengukuran" description="Pilih balita untuk mencatat pengukuran." to={(c) => `/balita/${c.id}/pengukuran/baru`} actionLabel="Catat pengukuran" />} />
          <Route path="grafik" element={<PlaceholderPage title="Grafik Pertumbuhan" />} />
          <Route path="grafik" element={<ChildPickerPage title="Grafik Pertumbuhan" description="Pilih balita untuk melihat grafik dan riwayat." to={(c) => `/balita/${c.id}`} actionLabel="Lihat grafik" />} />
          <Route
            path="peringatan"
            element={<PlaceholderPage title="Peringatan dan Tindak Lanjut" />}
          />
          <Route
            path="menu"
            element={<PlaceholderPage title="Rekomendasi Menu" />}
          />

          <Route element={<ProtectedRoute roles={["koordinator"]} />}>
            <Route
              path="dashboard"
              element={<PlaceholderPage title="Dashboard" />}
            />
            <Route
              path="laporan"
              element={<PlaceholderPage title="Laporan" />}
            />
            <Route
              path="pengaturan"
              element={<PlaceholderPage title="Pengaturan Akun" />}
            />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={<PlaceholderPage title="Halaman tidak ditemukan" />}
      />
    </Routes>
  );
}
