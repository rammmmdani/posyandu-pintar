// Ambil pesan error dari response API (format API Contract) atau pesan koneksi.
export function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    "Tidak dapat terhubung ke server. Periksa koneksi internet."
  );
}
