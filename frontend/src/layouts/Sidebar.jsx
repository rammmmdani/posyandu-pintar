import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Baby,
  Ruler,
  TrendingUp,
  BellRing,
  UtensilsCrossed,
  FileText,
  Settings,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Urutan sesuai PRD bagian 11.1
const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["koordinator"],
  },
  { to: "/balita", label: "Data Balita", icon: Baby },
  { to: "/pengukuran", label: "Pengukuran", icon: Ruler },
  { to: "/grafik", label: "Grafik Pertumbuhan", icon: TrendingUp },
  { to: "/peringatan", label: "Peringatan dan Tindak Lanjut", icon: BellRing },
  { to: "/menu", label: "Rekomendasi Menu", icon: UtensilsCrossed },
  { to: "/laporan", label: "Laporan", icon: FileText, roles: ["koordinator"] },
  {
    to: "/pengaturan",
    label: "Pengaturan Akun",
    icon: Settings,
    roles: ["koordinator"],
  },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-tinta/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-garis bg-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-garis px-5">
          <span className="text-lg font-bold text-daun-700">
            Posyandu Pintar
          </span>
          <button
            className="rounded-lg p-1 lg:hidden"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Menu utama" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                      isActive
                        ? "bg-daun-50 font-semibold text-daun-700"
                        : "font-medium text-redam hover:bg-kertas hover:text-tinta"
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <p className="border-t border-garis p-4 text-xs text-redam">
          Alat bantu pencatatan dan pemantauan, bukan pengganti penilaian tenaga
          kesehatan.
        </p>
      </aside>
    </>
  );
}
