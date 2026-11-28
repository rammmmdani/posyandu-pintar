import Button from "./Button";

export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.total_pages <= 1) return null;
  const { page, total_pages, total } = meta;

  return (
    <nav
      aria-label="Halaman data"
      className="flex flex-wrap items-center justify-between gap-2 pt-3 text-sm"
    >
      <p className="text-redam">
        Halaman {page} dari {total_pages} ({total} data)
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Sebelumnya
        </Button>
        <Button
          variant="secondary"
          disabled={page >= total_pages}
          onClick={() => onPageChange(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </nav>
  );
}
