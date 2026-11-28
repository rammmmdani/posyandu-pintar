import { useId } from "react";

export default function Select({
  label,
  error,
  id,
  className = "",
  children,
  ...props
}) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1 block text-sm font-medium text-tinta"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-tinta sm:py-2 ${
          error ? "border-red-600" : "border-garis"
        }`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="mt-1 text-xs text-red-700 sm:text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
