import { useId } from "react";

export default function Checkbox({
  label,
  error,
  id,
  className = "",
  ...props
}) {
  const autoId = useId();
  const boxId = id || autoId;
  return (
    <div className={className}>
      <div className="flex items-start gap-2.5">
        <input
          id={boxId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${boxId}-error` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-garis accent-daun-600"
          {...props}
        />
        <label htmlFor={boxId} className="text-sm text-tinta">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${boxId}-error`} className="mt-1 text-xs text-red-700 sm:text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
