import { useId } from "react";

export default function Input({
  label,
  error,
  hint,
  id,
  className = "",
  trailing,
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
          className="mb-1 block text-sm font-medium text-tinta"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-tinta placeholder:text-redam/70 sm:py-2 ${
            trailing ? "pr-10" : ""
          } ${error ? "border-red-600" : "border-garis"}`}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {trailing}
          </div>
        )}
      </div>
      {error ? (
        <p id={messageId} className="mt-1 text-xs text-red-700 sm:text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1 text-xs text-redam sm:text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
