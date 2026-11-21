import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./features/auth/LoginPage";
import PlaceholderPage from "./components/PlaceholderPage";
import ChildrenPage from './features/children/ChildrenPage';

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
          <Route 
            path="balita" element={<ChildrenPage />} 
          />
          <Route
            path="pengukuran"
            element={<PlaceholderPage title="Pengukuran" />}
          />
          <Route
            path="grafik"
            element={<PlaceholderPage title="Grafik Pertumbuhan" />}
          />
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
