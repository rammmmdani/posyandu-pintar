import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { getNotifications } from "../services/notificationsService";
import { useOnline } from "../hooks/useOnline";

const POLL_MS = 60000;

// Cukup meminta satu data untuk membaca meta.unread_count.
export default function NotificationBell() {
  const online = useOnline();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!online) return undefined;
    let cancelled = false;
    const load = () =>
      getNotifications({ is_read: "false", limit: 1 })
        .then((res) => !cancelled && setUnread(res.meta.unread_count))
        .catch(() => {});
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [online]);

  return (
    <Link
      to="/notifikasi"
      aria-label={
        unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"
      }
      className="relative rounded-lg p-2.5 hover:bg-kertas sm:p-2"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-700 px-1.5 text-center text-[11px] font-bold leading-5 text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
