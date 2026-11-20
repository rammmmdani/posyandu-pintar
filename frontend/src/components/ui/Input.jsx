import { useId } from "react";

export default function Input({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const messageId = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-tinta"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-tinta placeholder:text-redam/70 ${
          error ? "border-red-600" : "border-garis"
        }`}
        {...props}
      />
      {error ? (
        <p id={messageId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1 text-sm text-redam">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
