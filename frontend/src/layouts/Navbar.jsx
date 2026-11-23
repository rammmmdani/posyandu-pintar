import { useNavigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import NotificationBell from "./NotificationBell";

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b border-garis bg-white px-4 lg:px-8">
      <button
        className="rounded-lg p-2 hover:bg-kertas lg:hidden"
        onClick={onMenuClick}
        aria-label="Buka menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="ml-auto flex items-center gap-4">
        {/* Notifikasi */}
        <NotificationBell />

        {/* Informasi pengguna */}
        <div className="text-right leading-tight">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs capitalize text-redam">{user.role}</p>
        </div>

        {/* Tombol keluar */}
        <Button variant="secondary" onClick={handleLogout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Keluar
        </Button>
      </div>
    </header>
  );
}
