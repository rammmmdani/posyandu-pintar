import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // klik di area gelap
      }}
      className={`m-auto max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border border-garis p-0 backdrop:bg-tinta/40 ${
        wide ? "max-w-2xl" : "max-w-lg"
      }`}
    >
      <div className="flex items-center justify-between border-b border-garis px-4 py-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="rounded-lg p-2.5 hover:bg-kertas sm:p-2"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="px-4 py-3">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 border-t border-garis px-4 py-3">
          {footer}
        </div>
      )}
    </dialog>
  );
}
