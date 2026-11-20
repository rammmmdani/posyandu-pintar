const variants = {
  primary: "bg-daun-600 text-white hover:bg-daun-700",
  secondary: "border border-garis bg-white text-tinta hover:bg-daun-50",
  danger: "bg-red-700 text-white hover:bg-red-800",
  ghost: "text-daun-700 hover:bg-daun-50",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

// Dipakai juga untuk <Link>: <Link className={buttonClass('primary')}>
export const buttonClass = (variant = "primary", extra = "") =>
  `${base} ${variants[variant]} ${extra}`;

export default function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClass(variant, className)}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
