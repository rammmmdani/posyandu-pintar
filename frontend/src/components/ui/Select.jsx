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
          className="mb-1.5 block text-sm font-medium text-tinta"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-tinta ${
          error ? "border-red-600" : "border-garis"
        }`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
