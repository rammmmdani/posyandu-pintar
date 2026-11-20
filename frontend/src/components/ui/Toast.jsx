import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";

const ToastContext = createContext(null);

const tones = {
  success: "border-daun-600 bg-daun-50 text-daun-900",
  error: "border-red-600 bg-red-50 text-red-900",
  info: "border-sky-600 bg-sky-50 text-sky-900",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback(
    (id) => setToasts((list) => list.filter((t) => t.id !== id)),
    [],
  );

  const show = useCallback(
    (message, tone) => {
      const id = ++nextId.current;
      setToasts((list) => [...list, { id, message, tone }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      info: (m) => show(m, "info"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100%-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`flex items-start justify-between gap-3 rounded-lg border-l-4 px-4 py-3 text-sm ${tones[t.tone]}`}
          >
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Tutup pesan"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return ctx;
}
