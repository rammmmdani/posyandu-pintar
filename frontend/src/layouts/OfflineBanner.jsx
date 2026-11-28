import { WifiOff } from "lucide-react";
import { useOnline } from "../hooks/useOnline";

export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-amber-300 bg-amber-100 px-3 py-1.5 text-sm text-amber-900 sm:px-4 lg:px-5"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      Tidak ada koneksi internet. Data baru tidak dapat disimpan sampai koneksi
      kembali.
    </div>
  );
}
