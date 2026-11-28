export default function Spinner({ label = "Memuat..." }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 p-5 text-redam"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-daun-600 border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
